'use strict';

const Homey = require('homey');

class FibaroWalliDimmerDeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGWDEU-111-top-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGWDEU-111-bottom-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = FibaroWalliDimmerDeviceDriver;
