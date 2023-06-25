'use strict';

const Homey = require('homey');

class FibaroDoubleSmartModuleDevice extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGS-224_S1')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGS-224_S2')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = FibaroDoubleSmartModuleDevice;
