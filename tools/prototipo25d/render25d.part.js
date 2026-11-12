  // ===== TESTE 01 DE ADAPTAÇÃO (2,5D) =====================================================================================================================
  // Este trecho NÃO faz parte do jogo: tools/prototipo25d/build.py o encaixa na cópia de js/game.js que vira teste-01-adaptacao/game25d.js.
  // Projeção oblíqua: o CHÃO e o mapa ficam exatamente como são (o andar, as colisões e os controles não mudam). Só o que tem altura (as paredes "#") é
  // desenhado "para cima" (H25 px): o topo (a mesma peça do ambiente, mais clara) e a face da frente (a parte de baixo da mesma peça, mais escura).
  // As sombras vão para o chão, e quem está mais ao norte é desenhado primeiro. Atrás de uma parede alta o cachorrinho e os agentes aparecem como
  // uma silhueta, para a parede nunca esconder o que importa. Nada aqui mexe nas regras.
  let wall25 = null; // as paredes da fase já desenhadas, uma faixa por linha do mapa: { lv, sx, rows: [canvas ou null], base: [y de cada faixa em px do aparelho] }

  function wallRows25(sx) {
    if (wall25 && wall25.lv === lv && wall25.sx === sx) return wall25;
    const g = themeG, keep = { ctx: g.ctx, rect: g.rect, solid: g.solid, x: g.x, y: g.y, c: g.c, r: g.r, free: g.free, border: g.border };
    g.solid = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || lv.bld[r][c];
    const rows = [], base = [], W = Math.ceil(WORLD_W * sx), HH = Math.ceil((TILE + H25) * sx) + 2;
    for (let r = 0; r < ROWS; r++) {
      const y0 = Math.round((r * TILE - H25) * sx);
      base.push(y0);
      if (!lv.bld[r].some(Boolean)) { rows.push(null); continue; }
      const cv = document.createElement("canvas"); cv.width = W; cv.height = HH;
      const cx = cv.getContext("2d");
      cx.setTransform(sx, 0, 0, sx, 0, -y0); // (coordenadas do mundo; a faixa começa em y0, em pixels do aparelho)
      const rect = (x, y, w, h) => { const x0 = Math.round(x * sx) / sx, yy = Math.round(y * sx) / sx; cx.fillRect(x0, yy, Math.round((x + w) * sx) / sx - x0, Math.round((y + h) * sx) / sx - yy); }; // (alinhado aos pixels, como no jogo)
      g.ctx = cx; g.rect = rect; g.free = false;
      for (let c = 0; c < COLS; c++) {
        if (!lv.bld[r][c]) continue;
        g.c = c; g.r = r; g.border = c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1;
        const x = c * TILE, yFace = r * TILE + TILE - H25;
        if (r + 1 >= ROWS || !lv.bld[r + 1][c]) { // face da frente (só onde embaixo não há outra parede): a parte de baixo da peça, escurecida
          cx.save(); cx.beginPath(); cx.rect(x, yFace, TILE, H25); cx.clip();
          g.x = x; g.y = r * TILE; theme.wall(g);
          const gr = cx.createLinearGradient(0, yFace, 0, yFace + H25);
          gr.addColorStop(0, "rgba(10,12,22,.24)"); gr.addColorStop(1, "rgba(10,12,22,.52)");
          cx.fillStyle = gr; cx.fillRect(x, yFace, TILE, H25);
          cx.fillStyle = "rgba(255,255,255,.2)"; cx.fillRect(x, yFace, TILE, 1); // aresta clara entre o topo e a face
          cx.restore();
        }
        g.x = x; g.y = r * TILE - H25; theme.wall(g); // topo: levantado H25 px
        cx.fillStyle = "rgba(255,255,230,.13)"; cx.fillRect(x, r * TILE - H25, TILE, TILE);
      }
      rows.push(cv);
    }
    Object.assign(g, keep);
    return (wall25 = { lv, sx, rows, base });
  }

  // Sombras no chão (desenhadas antes das paredes): uma faixa à direita de cada parede (a luz vem da esquerda) e uma sombra de contato embaixo.
  function shadows25(c0, c1, r0, r1) {
    ctx.save();
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!lv.bld[r][c]) continue;
      const x = c * TILE, y = r * TILE;
      if (c + 1 < COLS && !lv.bld[r][c + 1]) { ctx.fillStyle = "rgba(0,0,0,.17)"; ctx.fillRect(x + TILE, y, 8, TILE); }
      if (r + 1 < ROWS && !lv.bld[r + 1][c]) {
        const gr = ctx.createLinearGradient(0, y + TILE, 0, y + TILE + 8);
        gr.addColorStop(0, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr; ctx.fillRect(x, y + TILE, TILE, 8);
      }
    }
    ctx.restore();
  }

  // A figura `a` ({ x, y = onde pisa, ghost, f }) está parcialmente atrás de uma parede? (a parede da linha de baixo sobe H25 px por cima dela)
  function hidden25(a) {
    const row = Math.floor(a.y / TILE) + 1;
    if (row >= ROWS || a.y + 3 <= row * TILE - H25) return false;
    const w = lv.bld[row];
    return !!(w && (w[Math.floor((a.x - 9) / TILE)] || w[Math.floor((a.x + 9) / TILE)]));
  }

  // Desenha as paredes e as figuras juntas, do norte para o sul: cada figura entra depois das paredes até a linha dela e antes das paredes mais ao sul.
  function paint25(list, sx, c0, c1, r0, r1) {
    const wr = wallRows25(sx);
    list.sort((a, b) => a.y - b.y);
    let i = 0;
    const upTo = (row) => { while (i < list.length && Math.floor(list[i].y / TILE) < row) { list[i].f(); i++; } };
    const xs = Math.round(c0 * TILE * sx), xe = Math.round((c1 + 1) * TILE * sx);
    for (let r = r0; r <= Math.min(ROWS - 1, r1 + 1); r++) {
      upTo(r);
      const cv = wr.rows[r];
      if (cv) ctx.drawImage(cv, xs, 0, xe - xs, cv.height, xs / sx, wr.base[r] / sx, (xe - xs) / sx, cv.height / sx); // 1 pixel da faixa = 1 pixel do aparelho: nada borrado
    }
    upTo(Infinity);
    for (const a of list) if (a.ghost && hidden25(a)) { ctx.globalAlpha = 0.7; a.f(); ctx.globalAlpha = 1; } // a silhueta de quem está atrás de uma parede
  }
  // ===== fim do TESTE 01 DE ADAPTAÇÃO (2,5D) ===============================================================================================================

