'use strict';

const Homey = require('homey');

class FibaroDoubleSwitchTwoDevice extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGS-223_S1')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGS-223_S2')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getActionCard('FGS-223_reset_meter')
      .registerRunListener((args, state) => {
        return args.device.resetMeterFlowListener(args, state);
      });
  }

}

module.exports = FibaroDoubleSwitchTwoDevice;
