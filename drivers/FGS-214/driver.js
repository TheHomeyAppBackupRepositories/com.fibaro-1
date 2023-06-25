'use strict';

const Homey = require('homey');

class FibaroSingleSwitchTwoDevice extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGS-214_S1')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGS-214_S2')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = FibaroSingleSwitchTwoDevice;
