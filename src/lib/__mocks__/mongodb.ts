// Manual mock for src/lib/mongodb
// Export a thenable (Promise-like) default that tests can set via setClient
const clientPromiseMock: any = {
  _value: undefined,
  setClient(v: any) {
    this._value = v
  },
  then(onFulfilled: any, onRejected?: any) {
    return Promise.resolve(this._value).then(onFulfilled, onRejected)
  },
}

export default clientPromiseMock
