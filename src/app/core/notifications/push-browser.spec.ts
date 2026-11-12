import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUSH_BROWSER } from './push-browser';
describe('Detección segura de Push fuera del navegador', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('no utiliza APIs del navegador en el servidor', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const browser = TestBed.inject(PUSH_BROWSER);
    expect(browser.supported).toBe(false);
    expect(browser.permission()).toBe('default');
    expect(() => browser.storage()).toThrow();
  });
  function browserRegistration(
    script = new URL('ngsw-worker.js', document.baseURI).href,
    state = 'activated',
  ) {
    const registration = { active: { state, scriptURL: script }, pushManager: {} };
    const getRegistration = vi.fn(async () => registration);
    vi.stubGlobal('navigator', {
      userAgent: 'Chrome/100',
      serviceWorker: { controller: undefined, getRegistration },
    });
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'default' });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    return { browser: TestBed.inject(PUSH_BROWSER), registration, getRegistration };
  }
  it('encuentra el registro activado de Angular aunque controller sea undefined', async () => {
    const { browser, registration, getRegistration } = browserRegistration();
    expect(browser.supported).toBe(true);
    expect(await browser.registration()).toBe(registration);
    expect(getRegistration).toHaveBeenCalledWith(new URL('ngsw-worker.js', document.baseURI).href);
  });
  it('rechaza registros de otro worker', async () => {
    const { browser } = browserRegistration(new URL('other-worker.js', document.baseURI).href);
    await expect(browser.registration()).rejects.toThrow('Worker inesperado');
  });
  it('rechaza un worker todavía no activado', async () => {
    const { browser } = browserRegistration(undefined, 'activating');
    await expect(browser.registration()).rejects.toThrow('Worker no activo');
  });
});
