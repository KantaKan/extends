import { describe, expect, it } from 'vitest'
import { codeFeatures } from './features'

describe('codeFeatures', () => {
  it('spots loops the player wrote', () => {
    expect(codeFeatures('for (let i = 0; i < 10; i++) new Slime()').loop).toBe(true)
    expect(codeFeatures('let n = 0\nwhile (n < 10) { new Slime(); n++ }').loop).toBe(true)
    expect(codeFeatures('[1, 2, 3].forEach(() => new Slime())').loop).toBe(true)
  })
  it('copy-pasted lines and loops in comments are not loops', () => {
    expect(codeFeatures('new Slime()\nnew Slime()\nnew Slime()').loop).toBe(false)
    expect(codeFeatures('// for (let i = 0; i < 10; i++)\nnew Slime()').loop).toBe(false)
    expect(codeFeatures('const format = 1').loop).toBe(false)
  })
  it('spots if statements, not the word in a comment', () => {
    expect(codeFeatures('if (slime.hunger > 50) slime.eat()').if).toBe(true)
    expect(codeFeatures('// if (slime.hunger > 50)\nslime.eat()').if).toBe(false)
    expect(codeFeatures('const gift = 1').if).toBe(false)
  })
  it('spots a function declared and reused, in every common style', () => {
    expect(codeFeatures('function gatherAll() { slime.gatherNearest() }\ngatherAll()\ngatherAll()').function).toBe(true)
    expect(codeFeatures('const go = () => slime.gatherNearest()\ngo(); go()').function).toBe(true)
    expect(codeFeatures('const go = function () {}\ngo()\ngo()').function).toBe(true)
  })
  it('spots a creature reading its own hunger with this', () => {
    expect(codeFeatures('update() { if (this.hunger > 50) this.eat() }').this).toBe(true)
    expect(codeFeatures('update() { if (slime.hunger > 50) this.eat() }').this).toBe(false)
    expect(codeFeatures('// this.hunger').this).toBe(false)
  })
  it('a function called once, or never declared, does not count', () => {
    expect(codeFeatures('function gatherAll() {}\ngatherAll()').function).toBe(false)
    expect(codeFeatures('slime.gatherNearest()\nslime.gatherNearest()').function).toBe(false)
    expect(codeFeatures('// function f() {}\n// f(); f()').function).toBe(false)
  })
})
