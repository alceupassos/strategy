# Skill — Gráficos financeiros interativos (Plotly no painel)

Contrato entre o modelo e o **site Strategy Partners**: o assistente inclui, quando útil, um bloco **exatamente** neste formato para o cliente desenhar com **Plotly.js** (zoom, pan, legenda).

## Marcador obrigatório

````markdown
```chart-json
{ ... JSON em UMA linha ou várias; ver esquema abaixo ... }
```
````

O fence tem de ser **`chart-json`** (não `json` genérico).

## Esquema do objeto

| Campo | Tipo | Obrigatório | Notas |
|--------|------|-------------|--------|
| `type` | string | sim | `line`, `bar`, `scatter`, `candlestick` |
| `title` | string | não | Título do gráfico |
| `xLabel`, `yLabel` | string | não | Eixos |
| `x` | array | sim* | Etiquetas ou datas (* candlestick obrigatório; linhas/barras se houver `series`) |
| `series` | array | para line/bar/scatter | `[{ "name": "…", "y": [ números ] }]` — mesmo comprimento que `x` quando `x` existe |
| `open`, `high`, `low`, `close` | arrays | candlestick | Comprimento igual a `x` |
| `traces` | array | não | Objetos Plotly parciais adicionais (médias móveis, linhas de referência, etc.) |

## Boas práticas (estilo analista de dados)

1. **Prosa primeiro**: explique o que o gráfico mostra; o JSON é complemento.
2. **≤ 500 pontos** por série; agregue (mensal, trimestral) se necessário.
3. **Valores numéricos** reais; não preencha com placeholders.
4. **Candlestick**: só quando houver OHLC explícito nos dados ou derivável sem inventar.
5. **Múltiplas séries**: use `series` com nomes claros (ex.: «Receita», «EBITDA», «Benchmark»).

## Exemplo line + duas séries

```chart-json
{
  "type": "line",
  "title": "Receita vs meta (R$ mi)",
  "xLabel": "Trimestre",
  "yLabel": "R$ milhões",
  "x": ["Q1", "Q2", "Q3", "Q4"],
  "series": [
    { "name": "Realizado", "y": [120, 135, 128, 150] },
    { "name": "Meta", "y": [125, 130, 132, 145] }
  ]
}
```

## Exemplo candlestick (mínimo)

```chart-json
{
  "type": "candlestick",
  "title": "Preço diário",
  "x": ["D1", "D2", "D3"],
  "open": [10, 10.5, 10.2],
  "high": [10.8, 11, 10.6],
  "low": [9.9, 10.4, 10],
  "close": [10.6, 10.7, 10.3]
}
```

## Traces extra (opcional)

Para uma SMA20 sobreposto num gráfico de linhas, pode-se acrescentar `traces`:

```chart-json
{
  "type": "line",
  "title": "Série com média",
  "x": ["1", "2", "3", "4", "5"],
  "series": [{ "name": "Preço", "y": [100, 102, 101, 105, 104] }],
  "traces": [
    { "type": "scatter", "mode": "lines", "name": "SMA2", "x": ["1", "2", "3", "4", "5"], "y": [100, 101, 101.33, 102.67, 103.33] }
  ]
}
```

(O cliente repassa objetos em `traces` ao Plotly; use apenas propriedades suportadas e arrays limitados.)
