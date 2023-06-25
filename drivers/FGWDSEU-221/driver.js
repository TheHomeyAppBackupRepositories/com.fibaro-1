'use strict';

const Homey = require('homey');

class FibaroWalliSwitchDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.homey.flow.getActionCard('walli_switch_turn_on')
      .registerRunListener((args, state) => {
        return args.device.setOutputRunListener(args, state, true);
      });

    this.homey.flow.getActionCard('walli_switch_turn_off')
      .registerRunListener((args, state) => {
        return args.device.setOutputRunListener(args, state, false);
      });

    this.homey.flow.getActionCard('walli_switch_toggle')
      .registerRunListener((args, state) => {
        return args.device.setOutputRunListener(args, state,
          !args.device.getCapabilityValue(`onoff.output${args.output}`));
      });

    this.homey.flow.getConditionCard('walli_switch_is_on')
      .registerRunListener((args, state) => {
        return args.device.isOnRunListener(args.output);
      });

    this.homey.flow.getDeviceTriggerCard('walli_switch_power_changed')
      .registerRunListener((args, state) => {
        this.log('Triggering power changed', args.output === state.output);
        return args.output === state.output;
      });

    this.homey.flow.getDeviceTriggerCard('FGWDSEU-221-top-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    this.homey.flow.getDeviceTriggerCard('FGWDSEU-221-bottom-switch')
      .registerRunListener((args, state) => {
        return state.scene === args.scene;
      });

    // Deprecated
    this.homey.flow.getDeviceTriggerCard('walli_switch_button_scenes')
      .registerRunListener((args, state) => {
        return args.button === state.button && args.presses === state.presses;
      });
  }

}

module.exports = FibaroWalliSwitchDriver;
