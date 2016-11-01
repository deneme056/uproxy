/// <reference path='./context.d.ts' />
/// <reference path='../../../third_party/polymer/polymer.d.ts' />

Polymer({
  editDescription: () => {
    this.descriptionInput = this.model.globalSettings.description;
    this.editing = true;
  },
  saveDescription: () => {
    this.model.globalSettings.description = this.descriptionInput;
    this.$.state.background.updateGlobalSetting('description', this.descriptionInput);
    this.editing = false;
  },
  cancelEditing: () => {
    this.editing = false;
  },
  ready: () => {
    this.model = ui_context.model;
    this.editing = false;
    this.descriptionInput = '';
  }
});
