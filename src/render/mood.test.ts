import { describe, expect, it } from 'vitest'
import { moodOf } from './mood'

describe('mood (status on the face)', () => {
  it('a fed, rested creature shows nothing', () => {
    expect(moodOf({ hunger: 10, energy: 90 })).toEqual({ hungry: false, tired: false })
  })
  it('hungry and worn out are separate signs', () => {
    expect(moodOf({ hunger: 80, energy: 90 })).toEqual({ hungry: true, tired: false })
    expect(moodOf({ hunger: 10, energy: 5 })).toEqual({ hungry: false, tired: true })
  })
})
