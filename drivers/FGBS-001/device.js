'use strict';

const { ZwaveDevice } = require('homey-zwavedriver');

class FibaroUniversalBinarySensor extends ZwaveDevice {

  onNodeInit() {
    // Register capability to get value during boot
    this.registerCapability('alarm_generic.contact1', 'BASIC', {
      multiChannelNodeId: 1,
      get: 'BASIC_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'BASIC_REPORT',
      reportParser: report => {
        if (report && report.hasOwnProperty('Value')) {
          return report['Value'] > 0;
        }
        return null;
      },
    });

    // Listen for input changes
    this.registerMultiChannelReportListener(1, 'BASIC', 'BASIC_SET', report => {
      const result = report.Value > 0;

      this.homey.flow.getDeviceTriggerCard('FGBS-001_i1_switch')
        .trigger(this)
        .catch(this.error);

      if (result) {
        this.homey.flow.getDeviceTriggerCard('FGBS-001_i1_on')
          .trigger(this)
          .catch(this.error);
      } else {
        this.homey.flow.getDeviceTriggerCard('FGBS-001_i1_off')
          .trigger(this)
          .catch(this.error);
      }

      this.setCapabilityValue('alarm_generic.contact1', result)
        .catch(this.error);
      return result;
    });

    // Register capability to get value during boot
    this.registerCapability('alarm_generic.contact1', 'BASIC', {
      multiChannelNodeId: 2,
      get: 'BASIC_GET',
      getOpts: {
        getOnStart: true,
      },
      report: 'BASIC_REPORT',
      reportParser: report => {
        if (report
          && report.hasOwnProperty('Value')) {
          return report['Value'] > 0;
        }
        return null;
      },
    });

    // Listen for input changes
    this.registerMultiChannelReportListener(2, 'BASIC', 'BASIC_SET', report => {
      const result = report.Value > 0;

      this.homey.flow.getDeviceTriggerCard('FGBS-001_i2_switch')
        .trigger(this)
        .catch(this.error);

      if (result) {
        this.homey.flow.getDeviceTriggerCard('FGBS-001_i2_on')
          .trigger(this)
          .catch(this.error);
      } else {
        this.homey.flow.getDeviceTriggerCard('FGBS-001_i2_off')
          .trigger(this)
          .catch(this.error);
      }

      this.setCapabilityValue('alarm_generic.contact2', result)
        .catch(this.error);
      return result;
    });

    /*
    =========================================================================
      Mapping measure_temperature capabilities to sensor multilevel commands
    =========================================================================
    */
    if (this.node.MultiChannelNodes['3']) {
      this.registerCapability('measure_temperature.sensor1', 'SENSOR_MULTILEVEL', {
        multiChannelNodeId: 3,
        get: 'SENSOR_MULTILEVEL_GET',
        getOpts: {
          getOnStart: true,
        },
        getParser: () => ({
          'Sensor Type': 'Temperature (version 1)',
          Properties1: {
            Scale: 0,
          },
        }),
        report: 'SENSOR_MULTILEVEL_REPORT',
        reportParser: report => this._temperatureReportParser(report, 1),
      });
    }

    if (this.node.MultiChannelNodes['4']) {
      this.registerCapability('measure_temperature.sensor2', 'SENSOR_MULTILEVEL', {
        multiChannelNodeId: 4,
        get: 'SENSOR_MULTILEVEL_GET',
        getOpts: {
          getOnStart: true,
        },
        getParser: () => ({
          'Sensor Type': 'Temperature (version 1)',
          Properties1: {
            Scale: 0,
          },
        }),
        report: 'SENSOR_MULTILEVEL_REPORT',
        reportParser: report => this._temperatureReportParser(report, 2),
      });
    }

    if (this.node.MultiChannelNodes['5']) {
      this.registerCapability('measure_temperature.sensor3', 'SENSOR_MULTILEVEL', {
        multiChannelNodeId: 5,
        get: 'SENSOR_MULTILEVEL_GET',
        getOpts: {
          getOnStart: true,
        },
        getParser: () => ({
          'Sensor Type': 'Temperature (version 1)',
          Properties1: {
            Scale: 0,
          },
        }),
        report: 'SENSOR_MULTILEVEL_REPORT',
        reportParser: report => this._temperatureReportParser(report, 3),
      });
    }

    if (this.node.MultiChannelNodes['6']) {
      this.registerCapability('measure_temperature.sensor4', 'SENSOR_MULTILEVEL', {
        multiChannelNodeId: 6,
        get: 'SENSOR_MULTILEVEL_GET',
        getOpts: {
          getOnStart: true,
        },
        getParser: () => ({
          'Sensor Type': 'Temperature (version 1)',
          Properties1: {
            Scale: 0,
          },
        }),
        report: 'SENSOR_MULTILEVEL_REPORT',
        reportParser: report => this._temperatureReportParser(report, 4),
      });
    }

    this.registerSetting('12', newValue => Buffer.from([Math.round(newValue / 16 * 255)]));
  }

  _temperatureReportParser(report, sensorNumber) {
    if (report
      && report.hasOwnProperty('Sensor Type')
      && report['Sensor Type'] === 'Temperature (version 1)'
      && report.hasOwnProperty('Sensor Value (Parsed)')) {
      const token = {
        temp: report['Sensor Value (Parsed)'],
      };

      this.homey.flow.getDeviceTriggerCard(`FGBS-001_temp${sensorNumber}`)
        .trigger(this, token)
        .catch(this.error);

      return report['Sensor Value (Parsed)'];
    }

    return null;
  }

}

module.exports = FibaroUniversalBinarySensor;
