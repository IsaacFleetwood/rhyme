(: java -jar ~/phd/research/work/query-language/rumbledb/rumbledb-1.21.0-standalone.jar run q1.xq :)
(: can set --parallel-execution no :)

let $data := json-file("/homes/tabeysin/research/js-queries/js/experiments/data/data1M.json")
let $total := sum($data.value)
return $total