import * as freedomMocker from '../freedom/mocks/mock-freedom-in-module-env';
declare let freedom: freedom.FreedomInModuleEnv;
freedom = freedomMocker.makeMockFreedomInModuleEnv();

import * as arraybuffers from '../arraybuffers/arraybuffers';
import * as rc4 from './rc4';

describe('rc4 transformer', () => {
  let transformer: rc4.Rc4Transformer;

  beforeEach(() => {
    transformer = new rc4.Rc4Transformer();
  });

  it('simple transform/restore', () => {
    const p = new Uint8Array([0, 1, 2]);

    const transformedFragments = transformer.transform(p);
    const result = transformer.restore(transformedFragments[0])[0];

    expect(arraybuffers.byteEquality(p, result)).toBeTruthy();
  });
});
