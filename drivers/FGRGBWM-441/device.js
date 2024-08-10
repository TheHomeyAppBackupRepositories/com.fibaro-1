'use strict';

const { ZwaveDevice, Util } = require('homey-zwavedriver');

const TIMEOUT = 1000 * 2; // 2 seconds
const NODE_TO_COLOR = {
  red: 2,
  green: 3,
  blue: 4,
  white: 5,
};

const INPUT_CONFIG_KEYS = ['input_config_1', 'input_config_2', 'input_config_3', 'input_config_4'];

class FibaroRGBWControllerDevice extends ZwaveDevice {

  async onNodeInit() {
    // this.enableDebug();
    // Color 'master', should always match with Homey's capability values
    this.currentHSV = {
      hue: this.getCapabilityValue('light_hue'),
      saturation: this.getCapabilityValue('light_saturation'),
      value: this.getCapabilityValue('dim'),
    };

    this.currentTemperature = this.getCapabilityValue('light_temperature');
    this.colorChangeReportTimeout = null;
    this.reportRGBW = {};
    this.stripType = this.getSetting('strip_type');

    this._registerCapabilities();
  }

  _registerCapabilities() {
    // Register capabilities & command classes
    this.registerCapability('onoff', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });
    this.registerCapability('dim', 'SWITCH_MULTILEVEL', {
      setOpts: {
        fn: (value, opts) => {
          this.currentHSV.value = value;
          if (this.getCapabilityValue('light_mode') === 'color') {
            return this._setLightColor();
          }
          return this._setLightTemperature();
        }
      }
    });

    /* eslint-disable */ //camelcase

    this.registerMultipleCapabilityListener(['light_saturation', 'light_hue', 'light_temperature', 'light_mode'], async (
      {
        light_hue, light_saturation, light_temperature, light_mode,
      }, opts) => {
      if (this.colorChangeReportTimeout) {
        this.homey.clearTimeout(this.colorChangeReportTimeout);
      }

      if (typeof light_hue === 'number') {
        this.currentHSV.hue = light_hue;
      }
      if (typeof light_saturation === 'number') {
        this.currentHSV.saturation = light_saturation;
      }
      if (typeof light_temperature === 'number') {
        this.currentTemperature = light_temperature;
      }

      let mode = this.getCapabilityValue('light_mode');
      if (typeof light_mode === 'string') {
        mode = light_mode;
      }
      /* eslint-enable */

      if (mode === 'color') {
        return this._setLightColor();
      }

      return this._setLightTemperature();
    });

    // Input/ report
    const measureVoltageParameters = {
      get: 'SWITCH_MULTILEVEL_GET',
      getOpts: {
        getOnStart: false,
      },
      report: 'SWITCH_MULTILEVEL_REPORT',
    };

    this.registerCapability('measure_voltage.input1', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 2,
      reportParser: report => this._multiChannelNodeReportParser(report, 2),
      ...measureVoltageParameters,
    });

    this.registerCapability('measure_voltage.input2', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 3,
      reportParser: report => this._multiChannelNodeReportParser(report, 3),
      ...measureVoltageParameters,
    });

    this.registerCapability('measure_voltage.input3', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 4,
      reportParser: report => this._multiChannelNodeReportParser(report, 4),
      ...measureVoltageParameters,
    });

    this.registerCapability('measure_voltage.input4', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 5,
      reportParser: report => this._multiChannelNodeReportParser(report, 5),
      ...measureVoltageParameters,
    });

    // Power capabilities
    this.registerCapability('meter_power', 'METER');
    this.registerCapability('measure_power', 'SENSOR_MULTILEVEL');
  }

  async onSettings({ oldSettings, newSettings, changedKeys = [] }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });

    // Set setting for input modes
    const filteredKeys = changedKeys.filter(key => INPUT_CONFIG_KEYS.includes(key));
    if (filteredKeys.length > 0) {
      const value = this._getInputModeFromSettings(newSettings);

      await this.configurationSet(
        {
          index: 14,
          size: 2,
          signed: false,
        },
        value,
      );
    }

    // Sets the correct led strip type
    if (changedKeys.includes('strip_type')) {
      await this._setLightModeBasedOnStripType(newSettings['strip_type'])
        .catch(this.error);
    }
  }

  /**
   * Creates the rgb color object for sending
   *
   * @returns {Promise<void>}
   */
  async _setLightColor() {
    this.currentHSV.value = this.getCapabilityValue('dim');

    const rgbColors = Util.convertHSVToRGB(this.currentHSV);
    rgbColors.white = 0;

    if (this.stripType === 'scw' || this.stripType === 'cct') {
      throw new Error('Selected LED strip setting does not support color');
    }
    await this.sendColors(rgbColors);
  }

  /**
   * Creates the temperature color object for sending
   *
   * @returns {Promise<void>}
   */
  async _setLightTemperature() {
    const colorTempValues = {
      blue: Math.round((1 - this.currentTemperature) * 255 * this.getCapabilityValue('dim')), // In temperature mode mix in blue to imitate cool white mode
      red: 0, // Set red to zero since we don't want colors
      green: 0, // Set red to zero since we don't want colors
      white: Math.round(255 * this.getCapabilityValue('dim')),
    };

    if (this.stripType === 'cct' || this.stripType === 'rgbw' || this.stripType === 'scw') {
      return this.sendColors(colorTempValues);
    }
    throw new Error('Selected LED strip setting does not support temperature');
  }

  /**
   * Function to send a object with color values to the correct multichannel node
   * The multichannelnodes are defined in the const NODE_TO_COLOR
   * @param {Object} colorObject Object with the color values to send, values in range 0-255.
   */
  async sendColors(colorObject) {
    if (!colorObject) return;

    // Set the new base for the report mutations
    this.reportRGBW = { ...colorObject };

    for (const key of Object.keys(colorObject)) {
      this.log(`Sending value: ${colorObject[key]} to node: ${NODE_TO_COLOR[key]}`);
      // Get the node matching with the color, then send the color value divided by 2.55 (0-99 range)
      await this.node.MultiChannelNodes[NODE_TO_COLOR[key]].CommandClass.COMMAND_CLASS_SWITCH_MULTILEVEL.SWITCH_MULTILEVEL_SET({ Value: Math.round((colorObject[key] / 255) * 99) });
    }
  }

  /**
   * Parses the report send by the device after a change in color
   *
   * @param report
   * @param multiChannelNodeId
   * @returns {number}
   */
  _multiChannelNodeReportParser(report, multiChannelNodeId) {
    // Determine if the report contains a color value or a voltage value.
    // console.log('EndpointId:', multiChannelNodeId, 'Value:', report['Value'], Math.round(report['Value (Raw)'].readUIntBE(0, 1)));

    // Translate the endpoint id's to internal input id's
    const inputNumber = multiChannelNodeId - 1;

    if (this.getSetting(`input_config_${inputNumber}`) && this.getSetting(`input_config_${inputNumber}`) === '8') {
      // The report has a value of 0-99, 100 levels. 0-10V input, so divide by 10.
      const voltageValue = Math.round((report['Value (Raw)'].readUIntBE(0, 1) / 99) * 10);
      if (voltageValue !== this.getCapabilityValue(`measure_voltage.input${inputNumber}`)) {
        this.homey.flow.getDeviceTriggerCard(`RGBW_volt_input${inputNumber}`)
          .trigger(this, { volt: voltageValue })
          .catch(this.error);
      }
      return voltageValue;
    }

    // Trigger the RGBW_input_off && RGBW_input_on Flows
    const value = Math.round(report['Value (Raw)'].readUIntBE(0, 1));
    if (value === 0) {
      this.homey.flow.getDeviceTriggerCard('RGBW_input_off')
        .trigger(this, null, { input: `${inputNumber}` })
        .catch(this.error);
    } else {
      this.homey.flow.getDeviceTriggerCard('RGBW_input_on')
        .trigger(this, null, { input: `${inputNumber}` })
        .catch(this.error);
    }

    // Get the associated color channel from the multichannel node number
    const color = Object.keys(NODE_TO_COLOR).find(key => {
      return NODE_TO_COLOR[key] === multiChannelNodeId;
    });

    this.reportRGBW[color] = Math.round((report['Value (Raw)'].readUIntBE(0, 1) / 99) * 255);

    // Debounce timeout to prevent glitches in the Homey UI.
    if (this.colorChangeReportTimeout) {
      this.homey.clearTimeout(this.colorChangeReportTimeout);
    }
    this.colorChangeReportTimeout = this.homey.setTimeout(() => {
      this._setColorFromReport()
        .catch(this.error);
    }, TIMEOUT);

    return null;
  }

  async _setColorFromReport() {
    if (this.reportRGBW.white === 0 && this.reportRGBW.red === 0 && this.reportRGBW.green === 0 && this.reportRGBW.blue === 0) {
      await this.setCapabilityValue('onoff', false);
      return;
    }

    if (this.reportRGBW.white > 0 && this.reportRGBW.red === 0 && this.reportRGBW.green === 0) {
      await this.setCapabilityValue('light_mode', 'temperature');
      const temperature = Math.round((1 - (this.reportRGBW.blue / this.reportRGBW.white)) * 100) / 100;
      await this.setCapabilityValue('light_temperature', temperature);
      await this.setCapabilityValue('dim', this.reportRGBW.white / 255);
    } else {
      const newHSV = Util.convertRGBToHSV(this.reportRGBW);
      await this.setCapabilityValue('light_mode', 'color');
      await this.setCapabilityValue('light_hue', newHSV.hue);
      await this.setCapabilityValue('light_saturation', newHSV.saturation);
      await this.setCapabilityValue('dim', newHSV.value);
    }
  }

  /**
   * Settings
   *
   * Set the correct light mode type when the user changes the type of led strip connected
   *
   * @param stripType
   * @returns {Promise<void>}
   */
  async _setLightModeBasedOnStripType(stripType) {
    this.stripType = stripType;
    switch (this.stripType) {
      case 'scr':
      case 'scg':
      case 'scb':
      case 'rgb':
        await this.setCapabilityValue('light_mode', 'color');
        return this._setLightColor();
      case 'scw':
      case 'cct':
        await this.setCapabilityValue('light_mode', 'temperature');
        return this._setLightTemperature();
      case 'rgbw':
      case 'other':
        // Do nothing
        break;
      default:
      // Do nothing
    }
  }

  /**
   * Returns the value for settings parameter 14
   *
   */
  _getInputModeFromSettings(settings) {
    let newSendValue = parseInt(settings[INPUT_CONFIG_KEYS[0]], 10) << 12;
    newSendValue += parseInt(settings[INPUT_CONFIG_KEYS[1]], 10) << 8;
    newSendValue += parseInt(settings[INPUT_CONFIG_KEYS[2]], 10) << 4;
    newSendValue += parseInt(settings[INPUT_CONFIG_KEYS[3]], 10);

    return newSendValue;
  }

  /**
   * Flow methods
   *
   * @param args
   * @param state
   * @returns {Promise<undefined|boolean|Error|boolean>}
   */
  async specificColorRunListener(args, state) {
    // Unfortunately the old flow args used r,g,b,w instead of red, green, blue, white
    // because of this, the color name has to be parsed

    if (typeof args.color !== 'string' || typeof args.brightness !== 'number') {
      throw new Error('invalid_args');
    }

    const brightness = Math.round(args.brightness * 100);

    const colors = {};

    switch (args.color) {
      case 'r':
        colors.red = brightness * 2.55;
        break;
      case 'g':
        colors.green = brightness * 2.55;
        break;
      case 'b':
        colors.blue = brightness * 2.55;
        break;
      case 'w':
        colors.white = brightness * 2.55;
        break;
      default:
        break;
    }

    return this.sendColors(colors);
  }

  /**
   * Sets the RGBW controller to animation modes
   *
   * @param args
   * @param state
   * @returns {Promise<void>}
   */
  async animationRunListener(args, state) {
    if (!this.stripType.includes('rgb')) {
      throw new Error('Animations only available in RGB(W) mode');
    }

    if (!args && !args.animation) {
      throw new Error('Incorrect animation selected');
    }
    let animation = parseInt(args.animation, 10);

    if (animation === 0) {
      return this._setLightColor();
    }
    if (animation === 11) {
      animation = Math.round(Math.random() * (10 - 6) + 6); // Random number between 6 and 10
    }

    return this.configurationSet({
      index: 72,
      size: 1,
    }, Buffer.from([animation]));
  }

}

module.exports = FibaroRGBWControllerDevice;
