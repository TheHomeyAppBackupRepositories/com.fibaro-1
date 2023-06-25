'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroDimmerTwoDevice extends ZwaveDevice {

  async onNodeInit() {
    this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
    this.registerCapability('dim', 'SWITCH_MULTILEVEL');
    this.registerCapability('measure_power', 'SENSOR_MULTILEVEL');
    this.registerCapability('meter_power', 'METER');

    this.registerSetting('force_no_dim', value => (value ? 2 : 0));
    this.registerSetting('kwh_report', value => value * 100);

    this.registerReportListener('SCENE_ACTIVATION', 'SCENE_ACTIVATION_SET', report => {
      if (!report['Scene ID']) {
        return null;
      }
      if (report.hasOwnProperty('Scene ID')) {
        const data = {
          scene: report['Scene ID'].toString(),
        };

        switch (this.getSetting('switch_type')) {
          case '0':
            this.homey.flow.getDeviceTriggerCard('FGD-212_momentary')
              .trigger(this, null, data)
              .catch(this.error);
            break;
          case '1':
            this.homey.flow.getDeviceTriggerCard('FGD-212_toggle')
              .trigger(this, null, data)
              .catch(this.error);
            break;
          case '2':
            this.homey.flow.getDeviceTriggerCard('FGD-212_roller')
              .trigger(this, null, data)
              .catch(this.error);
            break;
          default:
            return null;
        }
      }
    });
  }

  async setBrightnessRunListener(args, state) {
    if (typeof args.set_forced_brightness_level !== 'number') {
      throw new Error('forced_brightness_level_is_not_a_number');
    }
    if (args.set_forced_brightness_level > 1) {
      throw new Error('forced_brightness_level_out_of_range');
    }

    const brightnessLevel = Math.round(args.set_forced_brightness_level * 99);
    await this.configurationSet({
      id: 'forced_brightness_level',
    }, brightnessLevel);

    return this.setSettings({
      forced_brightness_level: brightnessLevel,
    });
  }

  async dimDurationRunListener(args, state) {
    if (!args.hasOwnProperty('dimming_duration')) {
      throw new Error('dimming_duration_property_missing');
    }
    if (typeof args.dimming_duration !== 'number') {
      throw new Error('dimming_duration_is_not_a_number');
    }
    if (args.brightness_level > 1) {
      throw new Error('brightness_level_out_of_range');
    }
    if (args.dimming_duration > 127) {
      throw new Error('dimming_duration_out_of_range');
    }

    if (this.node.CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL) {
      return this.node.CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_SET({
        Value: Buffer.from([Math.round(args.brightness_level * 99)]),
        'Dimming Duration': Buffer.from([args.dimming_duration + (args.duration_unit * 127)]),
      });
    }
    throw new Error('Missing SWITCH_MULTILEVEL command class');
  }

  async setTimerRunListener(args, state) {
    if (!args.hasOwnProperty('set_timer_functionality')) {
      throw new Error('set_timer_property_missing');
    }
    if (typeof args.set_timer_functionality !== 'number') {
      throw new Error('set_timer_is_not_a_number');
    }
    if (args.set_timer_functionality > 32767) {
      throw new Error('set_timer_out_of_range');
    }
    let value = null;
    try {
      value = Buffer.alloc(2);
      value.writeIntBE(args.set_timer_functionality, 0, 2);
    } catch (err) {
      this.error(err);
      throw new Error('failed_to_write_config_value_to_buffer');
    }

    await this.configurationSet({
      id: 'timer_functionality',
    }, value);
    return this.setSettings({
      timer_functionality: args.set_timer_functionality,
    });
  }

  async resetMeterRunListener(args, state) {
    if (this.node.CommandClass.COMMAND_CLASS_METER) {
      return this.node.CommandClass.COMMAND_CLASS_METER.METER_RESET({});
    }
    throw new Error('This device does not support meter resets');
  }

}

module.exports = FibaroDimmerTwoDevice;
