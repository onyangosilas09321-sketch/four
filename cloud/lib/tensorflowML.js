/**
 * TensorFlow.js-based machine learning for advanced price prediction
 * Implements LSTM and Dense networks for time-series forecasting
 */

const tf = require('@tensorflow/tfjs');

// Initialize TensorFlow
if (typeof require !== 'undefined') {
  try {
    require('@tensorflow/tfjs-node');
  } catch (e) {
    console.log('TensorFlow Node bindings not available, using WASM backend');
  }
}

class TensorFlowModel {
  constructor(sequenceLength = 60, features = 16) {
    this.sequenceLength = sequenceLength;
    this.features = features;
    this.model = null;
    this.isBuilt = false;
  }

  /**
   * Build LSTM model for time series prediction
   * @returns {tf.LayersModel} Compiled model
   */
  buildLSTMModel() {
    if (this.isBuilt && this.model) return this.model;

    this.model = tf.sequential({
      layers: [
        // Input: [batch, sequenceLength, features]
        tf.layers.lstm({
          units: 64,
          activation: 'relu',
          returnSequences: true,
          inputShape: [this.sequenceLength, this.features],
          name: 'lstm_1'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.lstm({
          units: 32,
          activation: 'relu',
          returnSequences: false,
          name: 'lstm_2'
        }),
        tf.layers.dropout({ rate: 0.2 }),

        // Dense layers
        tf.layers.dense({ units: 32, activation: 'relu', name: 'dense_1' }),
        tf.layers.dropout({ rate: 0.1 }),
        
        tf.layers.dense({ units: 16, activation: 'relu', name: 'dense_2' }),
        
        // Output: probability (0-1)
        tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'output' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.isBuilt = true;
    return this.model;
  }

  /**
   * Build a lighter CNN model for faster predictions
   * @returns {tf.LayersModel} Compiled model
   */
  buildCNNModel() {
    if (this.isBuilt && this.model) return this.model;

    this.model = tf.sequential({
      layers: [
        // Reshape for Conv1D: [batch, sequenceLength, features]
        tf.layers.conv1d({
          filters: 32,
          kernelSize: 5,
          activation: 'relu',
          inputShape: [this.sequenceLength, this.features],
          padding: 'same'
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),

        tf.layers.conv1d({
          filters: 16,
          kernelSize: 3,
          activation: 'relu',
          padding: 'same'
        }),
        tf.layers.maxPooling1d({ poolSize: 2 }),

        tf.layers.flatten(),
        
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.isBuilt = true;
    return this.model;
  }

  /**
   * Train model on historical data
   * @param {Array} X_train - Training features [samples, sequenceLength, features]
   * @param {Array} y_train - Training labels [samples]
   * @param {Object} options - Training options
   * @returns {Promise<Object>} Training history
   */
  async train(X_train, y_train, options = {}) {
    const {
      epochs = 50,
      batchSize = 32,
      validationSplit = 0.2,
      verbose = 1,
      modelType = 'lstm'
    } = options;

    if (!this.isBuilt) {
      if (modelType === 'cnn') {
        this.buildCNNModel();
      } else {
        this.buildLSTMModel();
      }
    }

    // Convert to tensors
    const xsTensor = tf.tensor3d(X_train);
    const ysTensor = tf.tensor2d(y_train, [y_train.length, 1]);

    try {
      const history = await this.model.fit(xsTensor, ysTensor, {
        epochs,
        batchSize,
        validationSplit,
        verbose: verbose ? 1 : 0,
        shuffle: true
      });

      return {
        success: true,
        history: history.history
      };
    } finally {
      xsTensor.dispose();
      ysTensor.dispose();
    }
  }

  /**
   * Predict next price move (0 or 1)
   * @param {Array} sequence - Feature sequence [sequenceLength, features]
   * @returns {Object} Prediction with confidence
   */
  predict(sequence) {
    if (!this.isBuilt || !this.model) {
      throw new Error('Model not built. Call buildLSTMModel() or buildCNNModel() first');
    }

    return tf.tidy(() => {
      const xTensor = tf.tensor3d([sequence]); // Add batch dimension
      const prediction = this.model.predict(xTensor);
      const value = prediction.dataSync()[0];
      return {
        confidence: value,
        prediction: value > 0.5 ? 1 : 0,
        probability: {
          bearish: 1 - value,
          bullish: value
        }
      };
    });
  }

  /**
   * Save model weights to object
   * @returns {Object} Serialized model
   */
  async saveWeights() {
    if (!this.model) {
      throw new Error('Model not built');
    }
    
    // Get weights as arrays
    const weights = this.model.getWeights().map(w => w.dataSync());
    return {
      type: 'tensorflow-lstm',
      sequenceLength: this.sequenceLength,
      features: this.features,
      weights: Array.from(weights).map(w => Array.from(w))
    };
  }

  /**
   * Load model weights from object
   * @param {Object} data - Serialized model data
   */
  loadWeights(data) {
    if (!this.isBuilt) {
      this.buildLSTMModel();
    }
    
    if (!data.weights || !Array.isArray(data.weights)) {
      throw new Error('Invalid weights format');
    }

    // Convert back to tensors
    const weightTensors = data.weights.map(w => tf.tensor(w));
    this.model.setWeights(weightTensors);
  }

  /**
   * Evaluate model on test data
   * @param {Array} X_test - Test features
   * @param {Array} y_test - Test labels
   * @returns {Promise<Object>} Evaluation metrics
   */
  async evaluate(X_test, y_test) {
    if (!this.isBuilt || !this.model) {
      throw new Error('Model not built');
    }

    const xsTensor = tf.tensor3d(X_test);
    const ysTensor = tf.tensor2d(y_test, [y_test.length, 1]);

    try {
      const result = this.model.evaluate(xsTensor, ysTensor);
      const [loss, accuracy] = result;
      
      return {
        loss: loss.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    } finally {
      xsTensor.dispose();
      ysTensor.dispose();
    }
  }

  /**
   * Cleanup: dispose of model
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isBuilt = false;
    }
  }
}

// Batch prediction helper
exports.batchPredict = function(model, sequences) {
  return tf.tidy(() => {
    const xTensor = tf.tensor3d(sequences);
    const predictions = model.predict(xTensor);
    return predictions.dataSync();
  });
};

// Create and export singleton instance
exports.TensorFlowModel = TensorFlowModel;

// Export helper functions
exports.createModel = function(sequenceLength = 60, features = 16) {
  return new TensorFlowModel(sequenceLength, features);
};

exports.dataPreprocessing = {
  /**
   * Normalize features to 0-1 range
   */
  normalizeFeatures(features, min, max) {
    return features.map(f => (f - min) / (max - min + 1e-8));
  },

  /**
   * Create sliding windows for sequence learning
   */
  createSequences(data, sequenceLength, stride = 1) {
    const sequences = [];
    for (let i = 0; i <= data.length - sequenceLength; i += stride) {
      sequences.push(data.slice(i, i + sequenceLength));
    }
    return sequences;
  },

  /**
   * Split data into train/validation/test
   */
  splitData(data, trainRatio = 0.7, valRatio = 0.15) {
    const n = data.length;
    const trainEnd = Math.floor(n * trainRatio);
    const valEnd = trainEnd + Math.floor(n * valRatio);
    
    return {
      train: data.slice(0, trainEnd),
      validation: data.slice(trainEnd, valEnd),
      test: data.slice(valEnd)
    };
  }
};
