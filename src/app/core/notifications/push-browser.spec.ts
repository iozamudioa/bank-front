import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { PUSH_BROWSER } from './push-browser';
describe('Detección segura de Push fuera del navegador', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('no utiliza APIs del navegador en el servidor', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const browser = TestBed.inject(PUSH_BROWSER);
    expect(browser.supported).toBe(false);
    expect(browser.permission()).toBe('default');
    expect(() => browser.storage()).toThrow();
  });
});
