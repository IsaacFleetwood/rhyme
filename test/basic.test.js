const rhyme = require('../src/rhyme')

// some sample data for testing
let data = [
    { key: "A", value: 10 },
    { key: "B", value: 20 },
    { key: "A", value: 30 }
]

let countryData = [
    { region: "Asia", country: "Japan", city: "Tokyo", population: 30 },
    { region: "Asia", country: "China", city: "Beijing", population: 20 },
    { region: "Europe", country: "France", city: "Paris", population: 10 },
    { region: "Europe", country: "UK", city: "London", population: 10 },
]

let regionData = [
    { region: "Asia", country: "Japan" },
    { region: "Asia", country: "China" },
    { region: "Europe", country: "France" },
    { region: "Europe", country: "UK" },
]

test("plainSumTest", () => {
    let query = rhyme.api.sum("data.*.value")
    let res = rhyme.api.compile(query)({ data })
    let expected = 60
    expect(res).toBe(expected)
})

test("plainAverageTest", () => {
    let query = rhyme.api.div(rhyme.api.sum("data.*.value"), rhyme.api.count("data.*.value"))
    let res = rhyme.api.compile(query)({ data })
    let expected = 20
    expect(res).toBe(expected)
})

test("uncorrelatedAverageTest", () => {
    let query = rhyme.api.div(rhyme.api.sum("data.*A.value"), rhyme.api.count("data.*B.value"))
    let res = rhyme.api.compile(query)({ data })
    let expected = 20
    expect(res).toBe(expected)
})

test("groupByTest", () => {
    let query = {
        total: rhyme.api.sum("data.*.value"),
        "data.*.key": rhyme.api.sum("data.*.value"),
    }
    let res = rhyme.api.compile(query)({ data })
    let expected = { "total": 60, "A": 40, "B": 20 }
    expect(res).toEqual(expected)
})

test("groupByAverageTest", () => {
    let avg = p => rhyme.api.div(rhyme.api.sum(p), rhyme.api.count(p))
    let query = {
        total: rhyme.api.sum("data.*.value"),
        "data.*.key": avg("data.*.value"),
    }
    let res = rhyme.api.compile(query)({ data })
    let expected = { "total": 60, "A": 20, "B": 20 }
    expect(res).toEqual(expected)
})

test("groupByRelativeSum", () => {
    let query = {
        total: rhyme.api.sum("data.*.value"),
        "data.*.key": rhyme.api.fdiv(rhyme.api.sum("data.*.value"), rhyme.api.sum("data.*B.value"))
    }
    let res = rhyme.api.compile(query)({ data })
    let expected = { "total": 60, "A": 0.6666666666666666, "B": 0.3333333333333333 }
    expect(res).toEqual(expected)
})

test("nestedGroupAggregateTest", () => {
    let query = {
        total: rhyme.api.sum("data.*.population"),
        "data.*.region": {
            total: rhyme.api.sum("data.*.population"),
            "data.*.city": rhyme.api.sum("data.*.population")
        },
    }
    let res = rhyme.api.compile(query)({ data: countryData })
    let expected = {
        "total": 70,
        "Asia": { "total": 50, "Beijing": 20, "Tokyo": 30 },
        "Europe": { "total": 20, "London": 10, "Paris": 10 }
    }
    expect(res).toEqual(expected)
})

test("joinSimpleTest", () => {
    let q1 = {
        "other.*O.country": "other.*O.region"
    }
    let query = {
        "-": rhyme.api.merge(rhyme.api.get(q1, "data.*.country"), {
            "data.*.city": rhyme.api.sum("data.*.population")
        }),
    }
    let res = rhyme.api.compile(query)({ data: countryData, other: regionData })
    let expected = {
        "Asia": {
            "Tokyo": 30,
            "Beijing": 20
        },
        "Europe": {
            "Paris": 10,
            "London": 10
        }
    }
    expect(res).toEqual(expected)
})

test("joinWithAggrTest", () => {
    let q1 = {
        "other.*O.country": "other.*O.region"
    }
    let query = {
        total: rhyme.api.sum("data.*.population"),
        "-": rhyme.api.merge(rhyme.api.get(q1, "data.*.country"), {
            total: rhyme.api.sum("data.*.population"),
            "data.*.city": rhyme.api.sum("data.*.population")
        }),
    }
    let res = rhyme.api.compile(query)({ data: countryData, other: regionData })
    let expected = {
        "total": 70,
        "Asia": {
            "total": 50,
            "Tokyo": 30,
            "Beijing": 20
        },
        "Europe": {
            "total": 20,
            "Paris": 10,
            "London": 10
        }
    }
    expect(res).toEqual(expected)
})

test("udfTest", () => {
    let data = [
        { item: "iPhone", price: 1200 },
        { item: "Galaxy", price: 800 },
    ]
    let udf = {
        formatDollar: p => "$" + p + ".00"
    }
    let query = [{
        item: "data.*.item",
        price: rhyme.api.apply("udf.formatDollar", "data.*.price")
    }]
    let res = rhyme.api.compile(query)({ data, udf })
    let expected = [{ item: "iPhone", price: "$1200.00" }, { item: "Galaxy", price: "$800.00" }]
    expect(res).toEqual(expected)
})

test("arrayTest1", () => {
    let query4 = rhyme.api.sum(rhyme.api.sum("data.*.value"))
    let res = rhyme.api.compile(query4)({ data })
    let expected = 60
    expect(res).toBe(expected)
})

test("arrayTest2", () => {
    let query1 = rhyme.api.array(rhyme.api.array("data.*.value"))
    let query2 = rhyme.api.array(rhyme.api.sum("data.*.value"))
    let query2A = rhyme.api.array({ v: rhyme.api.sum("data.*.value") })
    let query3 = rhyme.api.join(rhyme.api.array("data.*.value"))
    let query4 = rhyme.api.sum(rhyme.api.sum("data.*.value"))

    let res = rhyme.api.compile({ query1, query2, query2A, query3, query4 })({ data })
    let expected = {
        "query1": [[10, 20, 30]],
        "query2": [60],
        "query2A": [{ "v": 60 }],
        "query3": "10,20,30",
        "query4": 60
    }
    expect(res).toEqual(expected)
})

// TODO: this is the failing test from https://tiarkrompf.github.io/notes/?/js-queries/aside24
// test("arrayTest3", () => {
//     let query = { "data.*.key": ["Extra1", { foo: "data.*.value" }, "Extra2"] }
//     let res = rhyme.api.compile(query)({ data })
//     let expected = {
//         A: ["Extra1", "Extra2", { foo: 10 }, { foo: 30 }],
//         B: ["Extra1", "Extra2", { foo: 20 }]
//     }
//     expect(res).toEqual(expected)
// })