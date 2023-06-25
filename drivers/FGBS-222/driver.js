'use strict';

const Homey = require('homey');

class FibaroUniversalBinarySensorDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    // Input condition cards
    this.homey.flow.getConditionCard('FGBS-222_i1_state')
      .registerRunListener((args, state) => {
        return !args.device.getCapabilityValue('alarm_generic.input1');
      });

    this.homey.flow.getConditionCard('FGBS-222_i2_state')
      .registerRunListener((args, state) => {
        return !args.device.getCapabilityValue('alarm_generic.input2');
      });

    this.homey.flow.getConditionCard('FGBS-222_output1.state')
      .registerRunListener((args, state) => {
        return args.device.getCapabilityValue('onoff.output1');
      });
    this.homey.flow.getConditionCard('FGBS-222_output2.state')
      .registerRunListener((args, state) => {
        return args.device.getCapabilityValue('onoff.output2');
      });

    // Output action cards
    this.homey.flow.getActionCard('FGBS-222_o1_on')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output1', true);
      });
    this.homey.flow.getActionCard('FGBS-222_o1_off')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output1', false);
      });
    this.homey.flow.getActionCard('FGBS-222_o1_toggle')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output1', !args.device.getCapabilityValue('onoff.output1'));
      });
    this.homey.flow.getActionCard('FGBS-222_o2_on')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output2', true);
      });
    this.homey.flow.getActionCard('FGBS-222_o2_off')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output2', false);
      });
    this.homey.flow.getActionCard('FGBS-222_o2_toggle')
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener('onoff.output2', !args.device.getCapabilityValue('onoff.output2'));
      });
  }

}

module.exports = FibaroUniversalBinarySensorDriver;
