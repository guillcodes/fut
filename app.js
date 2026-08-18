const storageKeys = { players: 'varzea-players-v2', matches: 'varzea-matches-v2' };
const emptyPlayers = [];
const emptyMatches = [];
let players = JSON.parse(localStorage.getItem(storageKeys.players)) || emptyPlayers;
let matches = JSON.parse(localStorage.getItem(storageKeys.matches)) || emptyMatches;
const $ = (selector) => document.querySelector(selector);

function save() {
  localStorage.setItem(storageKeys.players, JSON.stringify(players));
  localStorage.setItem(storageKeys.matches, JSON.stringify(matches));
}
function initials(name) { return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(); }
function renderRanking() {
  const list = $('#ranking-list');
  list.innerHTML = [...players].sort((a, b) => b.points - a.points).slice(0, 5).map((player, index) => `
    <div class="ranking-row"><span class="rank ${index === 0 ? 'top' : ''}">${String(index + 1).padStart(2, '0')}</span><span class="rank-player"><small class="${player.color || ''}">${player.tag || initials(player.name)}</small>${player.name}</span><strong>${player.points}</strong></div>`).join('');
  $('#player-count').textContent = players.length;
}
function teamMarkup(name, tag, color) { return `<span class="team-dot ${color}">${tag || initials(name)}</span><b>${name}</b>`; }
function renderMatches() {
  $('#match-nav-count').textContent = matches.length;
  $('#match-list').innerHTML = matches.length ? matches.map((match, index) => `
    <article class="match-card"><div class="round-label">${match.round}<strong>${match.date}</strong></div><div class="match-teams">${teamMarkup(match.home, match.homeTag, index % 2 ? 'orange' : 'green')}<em class="versus">VS</em>${teamMarkup(match.away, match.awayTag, index % 2 ? 'green' : 'orange')}</div><div class="match-status"><small>${match.status}</small>${match.status === 'Aguardando' ? `<button data-match="${index}">Lançar resultado</button>` : `<span class="result-badge win">${match.score}</span>`}</div></article>`).join('') : '<div class="empty-state" style="min-height:231px;background:#fff;border:1px dashed #dce4d0;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#9aa4b1;gap:7px"><i data-lucide="shuffle"></i><strong style="color:#667080;font-size:13px">Nenhum confronto sorteado</strong><span style="font-size:11px">Cadastre pelo menos dois jogadores para começar.</span></div>';
  document.querySelectorAll('[data-match]').forEach(button => button.addEventListener('click', () => recordResult(Number(button.dataset.match))));
}
function renderHistory() {
  const completed = matches.filter(match => match.status === 'Finalizada').slice().reverse();
  $('#history-list').innerHTML = completed.length ? completed.map(match => {
    const [homeScore, awayScore] = match.score.split(' — ').map(Number);
    const resultType = homeScore === awayScore ? 'draw' : 'win';
    const resultLabel = homeScore === awayScore ? 'Empate' : 'Finalizada';
    return `<div class="activity-row"><span class="date-box"><b>${match.day}</b><small>${match.month}</small></span><div><strong>${match.home} <b>${match.score}</b> ${match.away}</strong><small>${match.round} · ${match.date}</small></div><span class="result-badge ${resultType}">${resultLabel}</span></div>`;
  }).join('') : '<div class="empty-state" style="min-height:155px"><i data-lucide="history"></i><strong>Nenhuma partida finalizada</strong><span>Os resultados lançados aparecerão aqui.</span></div>';
}
function updateStats() {
  const completed = matches.filter(match => match.status === 'Finalizada');
  const goals = completed.reduce((total, match) => total + match.score.split(' — ').reduce((sum, score) => sum + Number(score), 0), 0);
  $('#match-count').textContent = completed.length;
  $('#goal-count').textContent = goals;
}
function render() { renderRanking(); renderMatches(); renderHistory(); updateStats(); if (window.lucide) lucide.createIcons(); }
function toast(message) { $('#toast span').textContent = message; $('#toast').classList.add('show'); setTimeout(() => $('#toast').classList.remove('show'), 2300); }
function drawMatches() {
  if (players.length < 2) { toast('Cadastre pelo menos 2 jogadores primeiro.'); return; }
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  matches = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) matches.push({ round: `RODADA ${Math.ceil((i + 1) / 4) + 2}`, date: i < 4 ? 'Hoje, 20:00' : 'A definir', home: shuffled[i].name, homeTag: shuffled[i].tag || initials(shuffled[i].name), away: shuffled[i + 1].name, awayTag: shuffled[i + 1].tag || initials(shuffled[i + 1].name), status: 'Aguardando' });
  save(); render(); toast('Confrontos sorteados!');
}
let selectedMatchIndex = null;
function recordResult(index) {
  selectedMatchIndex = index;
  const match = matches[index];
  $('#result-title').textContent = `${match.home} x ${match.away}`;
  $('#home-score-label').firstChild.textContent = `Gols de ${match.home}`;
  $('#away-score-label').firstChild.textContent = `Gols de ${match.away}`;
  $('#home-score').value = '0'; $('#away-score').value = '0';
  $('#result-modal').classList.add('open'); $('#home-score').focus();
}
function saveResult(event) {
  event.preventDefault();
  if (selectedMatchIndex === null) return;
  const homeScore = Number($('#home-score').value); const awayScore = Number($('#away-score').value);
  if (homeScore < 0 || awayScore < 0 || !Number.isInteger(homeScore) || !Number.isInteger(awayScore)) return;
  const match = matches[selectedMatchIndex]; match.status = 'Finalizada'; match.score = `${homeScore} — ${awayScore}`;
  const today = new Date(); match.day = String(today.getDate()).padStart(2, '0'); match.month = today.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  const home = players.find(player => player.name === match.home); const away = players.find(player => player.name === match.away);
  if (home && away) { home.points += homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0; away.points += awayScore > homeScore ? 3 : homeScore === awayScore ? 1 : 0; }
  save(); render(); $('#result-modal').classList.remove('open'); selectedMatchIndex = null; toast('Resultado atualizado!');
}
$('#draw-button').addEventListener('click', drawMatches);
$('#reset-button').addEventListener('click', () => { players = []; matches = []; save(); render(); toast('Campeonato reiniciado.'); });
$('#add-player-button').addEventListener('click', () => { $('#modal').classList.add('open'); $('#player-name').focus(); });
$('#close-modal').addEventListener('click', () => $('#modal').classList.remove('open'));
$('#modal').addEventListener('click', event => { if (event.target.id === 'modal') $('#modal').classList.remove('open'); });
$('#close-result-modal').addEventListener('click', () => $('#result-modal').classList.remove('open'));
$('#result-modal').addEventListener('click', event => { if (event.target.id === 'result-modal') $('#result-modal').classList.remove('open'); });
$('#result-form').addEventListener('submit', saveResult);
$('#player-form').addEventListener('submit', event => { event.preventDefault(); const name = $('#player-name').value.trim(); const tag = $('#player-tag').value.trim().toUpperCase(); players.push({ name, tag, points: 0, color: '' }); save(); render(); $('#player-form').reset(); $('#modal').classList.remove('open'); toast(`${name} entrou no campeonato!`); });
render();
