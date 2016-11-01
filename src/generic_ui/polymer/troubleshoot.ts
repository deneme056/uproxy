import * as uproxy_core_api from '../../interfaces/uproxy_core_api';

Polymer({
  analyzingNetwork: false,
  analyzedNetwork: false,
  natType: '',
  natImpact: '',
  close: () => {
    this.$.troubleshootDialog.close();
  },
  open: () => {
    this.analyzedNetwork = false;
    this.analyzingNetwork = false;
    this.$.troubleshootDialog.open();
  },
  submitFeedback: () => {
    this.fire('core-signal', {
      name: 'open-feedback', data: {
        includeLogs: this.analyzedNetwork,
        feedbackType: uproxy_core_api.UserFeedbackType.PROXYING_FAILURE
      }
    });
    this.close();
  },
  getNatType: () => {
    this.analyzingNetwork = true;
    ui_context.core.getNatType().then((natType :string) => {
      this.natType = natType;
      if (natType === 'symmetric NAT') {
        this.natImpact = ui_context.ui.i18n_t('VERY_LIKELY');
      } else if (natType === 'port-restricted cone NAT') {
        this.natImpact = ui_context.ui.i18n_t('POSSIBLY');
      } else {
        this.natImpact = ui_context.ui.i18n_t('UNLIKELY');
      }
      this.analyzingNetwork = false;
      this.analyzedNetwork = true;
    });
  },
  ready: () => {
    this.model = ui_context.model;
  }
});
