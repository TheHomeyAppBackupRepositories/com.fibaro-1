'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroWalliDimmerDevice extends ZwaveDevice {

  onNodeInit() {
    // Migration for Old Walli setting
    this._migrateWalliClickSetting();

    this.registerCapability('onoff', 'SWITCH_MULTILEVEL');
    this.registerCapability('dim', 'SWITCH_MULTILEVEL');

    this.registerCapability('measure_power', 'METER');
    this.registerCapability('meter_power', 'METER');

    this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
      const buttonValue = { scene: report.Properties1['Key Attributes'] };
      if (report['Scene Number'] === 1) {
        this.homey.flow.getDeviceTriggerCard('FGWDEU-111-top-switch')
          .trigger(this, null, buttonValue)
          .catch(this.error);
      } else if (report['Scene Number'] === 2) {
        this.homey.flow.getDeviceTriggerCard('FGWDEU-111-bottom-switch')
          .trigger(this, null, buttonValue)
          .catch(this.error);
      }
    });
  }

  /**
   * There used to be an old boolean setting for double_click that was copied wrongly from a different device.
   * Later a new setting was added that inadvertently had the same name but a different type
   *
   * @private
   */
  _migrateWalliClickSetting() {
    const oldSetting = this.getSetting('double_click');

    if (typeof oldSetting !== 'number') {
      this.setSettings({
        double_click: 99, // default setting
      })
        .catch(this.error);
    }
  }

  async ledOnRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_on: args.color });
      return this.configurationSet({
        index: 11,
        size: 1,
        id: 'led_ring_color_on',
      }, Buffer.from([args.color]));
    }
  }

  async ledOffRunListener(args, state) {
    if (args.hasOwnProperty('color')) {
      await this.setSettings({ led_ring_color_off: args.color });
      return this.configurationSet({
        index: 12,
        size: 1,
        id: 'led_ring_color_off',
      }, Buffer.from([args.color]));
    }
  }

}

module.exports = FibaroWalliDimmerDevice;
