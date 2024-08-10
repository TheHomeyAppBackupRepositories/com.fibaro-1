'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');
const { WINDOW_COVERING_SET, WINDOW_COVERING_START_LEVEL_CHANGE, WINDOW_COVERING_STOP_LEVEL_CHANGE } = require('../../lib/command_classes/WindowCoveringCommandClass');

// https://products.z-wavealliance.org/products/4992
class FibaroRollerShutter4Device extends ZwaveDevice {

  /** @type number */
  calibrationState = undefined;
  /** @type number */
  operatingMode = undefined;
  /** @type boolean */
  invertTilt= false;
  /** @type number */
  switchType = undefined;

  async onNodeInit({ node }) {
    await super.onNodeInit({ node });

    await this.registerSettings();
    await this.registerCapabilities();

    await this.fixCapabilities(this.calibrationState, this.operatingMode);

    this.invertTilt = this.getSetting('invert_tilt') ?? false;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('operating_mode')) {
      const operatingMode = parseInt(newSettings['operating_mode'], 10);
      this.operatingMode = operatingMode;
      await this.fixCapabilities(this.calibrationState, operatingMode);
    }
    if (changedKeys.includes('switch_type')) {
      const switchType = parseInt(newSettings['switch_type'], 10);
      this.switchType = switchType;
      await this.fixButtons(switchType);
    }
    if (changedKeys.includes('invert_tilt')) {
      this.invertTilt = newSettings['invert_tilt'];
    }
    return super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  async handleConfigurationReport(report, initialReport = false) {
    const { 'Parameter Number': parameterNumber, 'Configuration Value': parameterValue } = report;

    if (parameterNumber === 150) {
      await this.handleCalibrationStateReport(parameterValue);
    } else if (parameterNumber === 151) {
      await this.handleOperatingModeReport(parameterValue);
    } else if (parameterNumber === 156) {
      await this.handleCalibrationReport(parameterValue, true);
    } else if (parameterNumber === 157) {
      await this.handleCalibrationReport(parameterValue, false);
    }

    if (parameterNumber === 20) {
      await this.handleSwitchTypeReport(parameterValue);
      await this.fixButtons(this.switchType);
    }

    if (!initialReport && (parameterNumber === 150 || parameterNumber === 151)) {
      await this.fixCapabilities(this.calibrationState, this.operatingMode);
    }
  }

  async handleCalibrationStateReport(parameterValue) {
    const calibrationState = parameterValue[0];
    this.log('Calibration state:', calibrationState);
    await this.setSettings({
      calibration_state: this.parseCalibrationState(calibrationState),
    }).catch(err => this.error('Failed to set setting:', err));
    this.calibrationState = calibrationState;
  }

  async handleCalibrationReport(parameterValue, up) {
    const time = parameterValue.readInt16BE() / 10;
    await this.setSettings({ [`time_${up ? 'up' : 'down'}_movement`]: time })
      .catch(err => this.error('Failed to set setting:', err));
    this.log(`Time ${up ? 'up' : 'down'}:`, time);
  }

  async handleOperatingModeReport(parameterValue) {
    const operatingMode = parameterValue[0];
    this.log('Operating mode:', operatingMode);
    await this.setSettings({
      operating_mode: operatingMode.toFixed(),
    }).catch(err => this.error('Failed to set setting:', err));
    this.operatingMode = operatingMode;
  }

  async handleSwitchTypeReport(parameterValue) {
    const switchType = parameterValue[0];
    this.log('Switch type:', switchType);
    await this.setSettings({
      switch_type: switchType.toFixed(),
    }).catch(err => this.error('Failed to set setting:', err));
    this.switchType = switchType;
  }

  async handleNotificationReport(report) {
    if (report) {
      const notificationType = report['Notification Type (Raw)'][0];
      const notificationState = report['Event'];
      this.log('Notification type', notificationType, 'state:', notificationState);

      if (notificationType === 0x08) {
        await this._setCapabilityValueSafe('alarm_overcurrent', notificationState !== 0x00);
      } else if (notificationType === 0x09) {
        await this._setCapabilityValueSafe('alarm_overheating', notificationState !== 0x00);
      }
    }
  }

  async handleCentralSceneReport(report) {
    if (!report) {
      throw new Error('Empty report');
    }

    const button = report['Scene Number'];
    const buttonAction = report['Properties1']['Key Attributes'];
    this.log('Button:', button, 'action:', buttonAction);

    return this.homey.flow.getDeviceTriggerCard(`windowcoverings-switch-${button}`).trigger(this, {}, {
      scene: buttonAction,
    });
  }

  async handleWindowCoveringReport(report) {
    const parameterId = report['Parameter ID (Raw)'].readUInt8();
    const value = this.parsePercentage(report['Current Value']);
    // this.log('Window covering parameter', parameterId, 'set to:', value);

    if (parameterId === 0x0D) {
      await this._setCapabilityValueSafe('windowcoverings_set', value);
    } else if (parameterId === 0x17) {
      await this._setCapabilityValueSafe('windowcoverings_tilt_set', value);
    }
  }

  parseCalibrationState(code) {
    if (code === 0) {
      return this.homey.__('settings.calibrationState.uncalibrated');
    } if (code === 1) {
      return this.homey.__('settings.calibrationState.auto_success');
    } if (code === 2) {
      return this.homey.__('settings.calibrationState.auto_failure');
    } if (code === 3) {
      return this.homey.__('settings.calibrationState.calibrating');
    } if (code === 4) {
      return this.homey.__('settings.calibrationState.manual');
    }
    return this.homey.__('settings.calibrationState.unknown');
  }

  async resetMetering() {
    await this.node.CommandClass.COMMAND_CLASS_METER.METER_RESET()
      .then(async res => {
        this.log('Meter reset:', res);
        await this._setCapabilityValueSafe('meter_power', 0);
      })
      .catch(err => this.error('Err:', err));
  }

  parsePercentage(value) {
    if (value > 99) {
      return null;
    }
    return value / 99;
  }

  async setPercentage(value, id) {
    const levelValue = Math.round(99 * value);
    const parameters = new Map([[id, levelValue]]);
    return WINDOW_COVERING_SET(this.node, parameters)
      .catch(err => this.error('Err:', err));
  }

  async setLevel(value) {
    await this.setPercentage(value, 13);
  }

  async setTilt(value) {
    const processedValue = this.invertTilt ? 1 - value : value;
    await this.setPercentage(processedValue, 23);
  }

  async jogTilt(up) {
    const processedValue = up !== this.invertTilt;
    return WINDOW_COVERING_START_LEVEL_CHANGE(this.node, 0x16, processedValue)
      .catch(err => this.error('Err:', err));
  }

  async jogLevel(value) {
    let returnPromise;

    if (value === 'up') {
      const processedValue = this.invertTilt !== true;
      returnPromise = WINDOW_COVERING_START_LEVEL_CHANGE(this.node, 0x0C, processedValue);
    } else if (value === 'down') {
      const processedValue = this.invertTilt !== false;
      returnPromise = WINDOW_COVERING_START_LEVEL_CHANGE(this.node, 0x0C, processedValue);
    } else {
      returnPromise = WINDOW_COVERING_STOP_LEVEL_CHANGE(this.node, 0x0C);
    }

    return returnPromise.catch(err => this.error('Err:', err));
  }

  async registerCapabilities() {
    if (!this.hasCapability('windowcoverings_set')) {
      await this.addCapability('windowcoverings_set');
    }
    this.registerCapabilityListener('windowcoverings_set', value => this.setLevel(value));

    if (!this.hasCapability('windowcoverings_tilt_set')) {
      await this.addCapability('windowcoverings_tilt_set');
    }
    this.registerCapabilityListener('windowcoverings_tilt_set', value => this.setTilt(value));

    if (!this.hasCapability('windowcoverings_tilt_up')) {
      await this.addCapability('windowcoverings_tilt_up');
    }
    this.registerCapabilityListener('windowcoverings_tilt_up', value => this.jogTilt(true));

    if (!this.hasCapability('windowcoverings_tilt_down')) {
      await this.addCapability('windowcoverings_tilt_down');
    }
    this.registerCapabilityListener('windowcoverings_tilt_down', value => this.jogTilt(false));

    if (!this.hasCapability('windowcoverings_state')) {
      await this.addCapability('windowcoverings_state');
    }
    this.registerCapabilityListener('windowcoverings_state', value => this.jogLevel(value));

    this.registerCapability('meter_power', 'METER');

    this.registerReportListener(
      'NOTIFICATION',
      'NOTIFICATION_REPORT',
      report => this.handleNotificationReport(report).catch(err => this.error('Failed to handle notification report:', err)),
    );

    this.registerReportListener(
      'CENTRAL_SCENE',
      'CENTRAL_SCENE_NOTIFICATION',
      report => this.handleCentralSceneReport(report).catch(err => this.error('Failed to handle central scene notification report:', err)),
    );

    this.node.CommandClass.COMMAND_CLASS_NOTIFICATION.NOTIFICATION_GET({
      'V1 Alarm Type': 0x00,
      'Notification Type': 'Power Management',
      Event: 0x06,
    })
      .then(res => this.handleNotificationReport(res))
      .catch(err => this.error(err));

    this.node.CommandClass.COMMAND_CLASS_NOTIFICATION.NOTIFICATION_GET({
      'V1 Alarm Type': 0x00,
      'Notification Type': 'System',
      Event: 0x03,
    })
      .then(res => this.handleNotificationReport(res))
      .catch(err => this.error(err));

    this.registerReportListener(
      'WINDOW_COVERING',
      'WINDOW_COVERING_REPORT',
      report => this.handleWindowCoveringReport(report).catch(err => this.error('Failed to handle window covering report:', err)),
    );
    // Getting the initial values for the covering level and tilt always seems to report a failure,
    // but as these still get updated whenever their values are changed a de-sync should remedy itself
  }

  async fixCapabilities(calibrationState, operatingMode) {
    // Capabilities to remove if present
    const removeCapabilities = [];
    // Capabilities to add if not present
    const addCapabilities = [];
    if (calibrationState === 0 || calibrationState === 2) {
      // Uncalibrated, only jogging controls available
      removeCapabilities.push('windowcoverings_set', 'windowcoverings_tilt_set');
      addCapabilities.push('windowcoverings_state');
      if (operatingMode === 0) {
        // No tilt
        removeCapabilities.push('windowcoverings_tilt_up', 'windowcoverings_tilt_down');
      } else {
        // Tilt
        addCapabilities.push('windowcoverings_tilt_up', 'windowcoverings_tilt_down');
      }
    } else {
      // Calibrated, only exact controls available
      removeCapabilities.push('windowcoverings_state', 'windowcoverings_tilt_up', 'windowcoverings_tilt_down');
      addCapabilities.push('windowcoverings_set');
      if (operatingMode === 0) {
        // No tilt
        removeCapabilities.push('windowcoverings_tilt_set');
      } else {
        // Tilt
        addCapabilities.push('windowcoverings_tilt_set');
      }
    }

    for (const addCapability of addCapabilities) {
      if (!this.hasCapability(addCapability)) {
        await this.addCapability(addCapability);
      }
    }

    for (const removeCapability of removeCapabilities) {
      if (this.hasCapability(removeCapability)) {
        await this.removeCapability(removeCapability);
      }
    }

    this.log(`Fixed capabilities\nAdded:   ${addCapabilities}\nRemoved: ${removeCapabilities}`);
  }

  async fixButtons(switchType) {
    const capability = 'dummy_uses_monostable_switches';
    if (switchType !== undefined && switchType < 3) {
      if (!this.hasCapability(capability)) {
        await this.addCapability(capability);
      }
    } else if (this.hasCapability(capability)) {
      await this.removeCapability(capability);
    }
  }

  async registerSettings() {
    this.registerSetting('time_slat_turn', value => {
      const scaledValue = Math.floor(value * 10);
      return scaledValue;
    });
    this.registerSetting('time_up_movement', value => {
      const scaledValue = Math.floor(value * 10);
      return scaledValue;
    });
    this.registerSetting('time_down_movement', value => {
      const scaledValue = Math.floor(value * 10);
      return scaledValue;
    });
    // Maintenance actions
    this.registerCapabilityListener('button.force_calibration', async () => {
      await this.configurationSet({ index: 150, size: 1 }, 3);
    });
    this.registerCapabilityListener('button.reset_meter', async () => {
      await this.resetMetering();
    });
    // Calibration settings
    this.registerReportListener(
      'CONFIGURATION',
      'CONFIGURATION_REPORT',
      report => this.handleConfigurationReport(report).catch(err => this.error('Failed to handle configuration report:', err)),
    );

    await this.configurationGet({ index: 20 })
      .then(report => this.handleConfigurationReport(report, true))
      .catch(err => this.error(err));

    await this.configurationGet({ index: 150 })
      .then(report => this.handleConfigurationReport(report, true))
      .catch(err => this.error(err));

    await this.configurationGet({ index: 151 })
      .then(report => this.handleConfigurationReport(report, true))
      .catch(err => this.error(err));

    await this.configurationGet({ index: 156 })
      .then(report => this.handleConfigurationReport(report, true))
      .catch(err => this.error(err));

    await this.configurationGet({ index: 157 })
      .then(report => this.handleConfigurationReport(report, true))
      .catch(err => this.error(err));
  }

}

module.exports = FibaroRollerShutter4Device;
