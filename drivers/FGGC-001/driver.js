'use strict';

const Homey = require('homey');

class FibaroSwipeDeviceDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('fggc-001_swipe_direction_single')
      .registerRunListener((args, state) => {
        return (state.direction === args.direction);
      });

    this.homey.flow.getDeviceTriggerCard('fggc-001_swipe_round')
      .registerRunListener((args, state) => {
        return (state.direction === args.direction && state.scene === args.scene);
      });

    this.homey.flow.getDeviceTriggerCard('fggc-001_swipe_sequence')
      .registerRunListener((args, state) => {
        return state.direction === args.direction;
      });

    // Old deprecated Flow
    this.homey.flow.getDeviceTriggerCard('fggc-001_swipe_direction')
      .registerRunListener((args, state) => {
        return (state.direction === args.direction && state.scene === args.scene);
      });
  }

}

module.exports = FibaroSwipeDeviceDriver;
