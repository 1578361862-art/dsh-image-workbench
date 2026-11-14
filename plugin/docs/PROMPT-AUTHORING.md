# Prompt authoring & Context-IR cost

MiniMax bills `H3-Image-Context-IR` by input text tokens: **$2.30 / M input tokens**. Failed requests are not billed. Output/thinking cost is folded into `usage.input_tokens`.

Our 8 exploratory calls used **32,343 input tokens**:

- 32,343 / 1,000,000 × $2.30 = **$0.0744**
- roughly **¥0.53** at 7.1 CNY/USD; actual billing depends on the MiniMax account.

Image Edit always runs prompt enhancement. Calling Context-IR separately and then passing the revised prompt to Image Edit runs enhancement again and bills it again.

The normal workbench no longer has an "优化提示词" button. Prompts are curated once when a style is added. For the 7 reference styles, the example image is sent as `图2` style reference instead of relying on Context-IR.

One-off authoring helper:

```bash
MINIMAX_API_KEY=... node scripts/optimize-style-prompt.mjs prompt.txt out.json
```

Review the result before baking it into `client.js` / `index.js`. In our test, Context-IR collapsed the styles into a generic dark-fantasy woman scene, so those outputs were rejected.
