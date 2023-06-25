'use strict';

const Homey = require('homey');

class FibaroSingleSwitchTwoDevice extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGS-213_S1')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGS-213_S2')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getActionCard('FGS-213_reset_meter')
      .registerRunListener((args, state) => {
        return args.device.resetMeterRunListener(args, state);
      });
  }

}

module.exports = FibaroSingleSwitchTwoDevice;
