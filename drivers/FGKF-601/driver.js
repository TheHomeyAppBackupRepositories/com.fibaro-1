'use strict';

const Homey = require('homey');

class FibaroKeyfobDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getDeviceTriggerCard('FGKF-601-scene')
      .registerRunListener((args, state) => {
        return (state.button === args.button
          && state.scene === args.scene);
      });
    this.homey.flow.getDeviceTriggerCard('FGKF-601-sequence')
      .registerRunListener((args, state) => {
        return state.sequence === args.sequence;
      });
  }

}

module.exports = FibaroKeyfobDriver;
