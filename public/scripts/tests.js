function assert(data) {
  let results = []

  for (let [test, error] of data) {
    console.assert(test, error)
    results.push(test)
  }

  return results
}

const tests = {
  input() {
    const placeholder = "Type here..."

    return assert([
      [input == null, "input is not defined"],
      [input?.placeholder != placeholder, "input placeholder is not set to 'Type here...'"]
    ])
  },
  sendBtn() {
    return assert([
      [sendBtn != null, "send button is not defined"],
    ])
  },
  websockets() {

  }
}

for (let test in tests) {
  tests[test].call()
}