/// <reference path='./context.d.ts' />
/// <reference path='../../../third_party/polymer/polymer.d.ts' />

Polymer({
  isEmail: (text :string) => {
    /* regex from regular-expressions.info */
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(text);
  },
  ready: () => {
    this.model = ui_context.model;
  }
});
