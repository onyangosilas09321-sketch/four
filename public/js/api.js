if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
window.API = {
  async getMetrics(){ return await Parse.Cloud.run('getMetrics'); },
  async listTrades(params){ return await Parse.Cloud.run('listTrades', params||{}); },
  async controlPause(){ return await Parse.Cloud.run('controlPause'); },
  async controlResume(){ return await Parse.Cloud.run('controlResume'); },
  async emergencyStop(){ return await Parse.Cloud.run('emergencyStop'); },
  async getSettings(){ return await Parse.Cloud.run('getSettings'); },
  async saveSettings(p){ return await Parse.Cloud.run('saveSettings', p||{}); },
  async mlPerformance(){ return await Parse.Cloud.run('mlPerformance'); },
  async mlAccuracy(p){ return await Parse.Cloud.run('mlAccuracy', p||{}); },
  async mlRetrain(){ return await Parse.Cloud.run('mlRetrain'); },
  async saveTick(p){ return await Parse.Cloud.run('saveTick', p||{}); },
  async trainModel(p){ return await Parse.Cloud.run('trainModel', p||{}); },
  async getModel(){ return await Parse.Cloud.run('getModel'); },
  async predict(p){ return await Parse.Cloud.run('predict', p||{}); },
  async saveOrder(p){ return await Parse.Cloud.run('saveOrder', p||{}); },
  async recordTrade(p){ return await Parse.Cloud.run('recordTrade', p||{}); },
  async updateBalance(p){ return await Parse.Cloud.run('updateBalance', p||{}); },
  async canTrade(){ return await Parse.Cloud.run('canTrade'); },
  async listCandles(p){ return await Parse.Cloud.run('listCandles', p||{}); }
};