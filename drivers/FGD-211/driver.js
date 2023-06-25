'use strict';

const Homey = require('homey');

class FibaroDimmerDeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGD-211_momentary')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGD-211_toggle')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
    this.homey.flow.getDeviceTriggerCard('FGD-211_roller')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });
  }

}

module.exports = FibaroDimmerDeviceDriver;
