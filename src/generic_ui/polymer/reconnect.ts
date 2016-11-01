/// <reference path='./context.d.ts' />
import * as ui_constants from '../../interfaces/ui';

Polymer({
  logout: () => {
    ui_context.ui.stopReconnect();
    ui_context.ui.view = ui_constants.View.SPLASH;
  },
  ready: () => {
    this.model = ui_context.model;
  }
});
