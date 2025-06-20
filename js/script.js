document.addEventListener('DOMContentLoaded', () => {

    const yakuData = [
        { id: 'tsumo', name_jp: '門前清自摸和', han_closed: 1, han_open: null }, { id: 'pinfu', name_jp: '平和', han_closed: 1, han_open: null },
        { id: 'tanyao', name_jp: '断么九', han_closed: 1, han_open: 1 }, { id: 'iipeikou', name_jp: '一盃口', han_closed: 1, han_open: null },
        { id: 'rinshan', name_jp: '嶺上開花', han_closed: 1, han_open: 1 }, { id: 'chankan', name_jp: '槍槓', han_closed: 1, han_open: 1 },
        { id: 'haitei', name_jp: '海底摸月/河底撈魚', han_closed: 1, han_open: 1 }, { id: 'chiitoitsu', name_jp: '七對子', han_closed: 2, han_open: null },
        { id: 'toitoi', name_jp: '對對和', han_closed: 2, han_open: 2 }, { id: 'sanankou', name_jp: '三暗刻', han_closed: 2, han_open: 2 },
        { id: 'sankantsu', name_jp: '三槓子', han_closed: 2, han_open: 2 }, { id: 'sanshoku_doukou', name_jp: '三色同刻', han_closed: 2, han_open: 2 },
        { id: 'honroutou', name_jp: '混老頭', han_closed: 2, han_open: 2 }, { id: 'shousangen', name_jp: '小三元', han_closed: 2, han_open: 2 },
        { id: 'ryanpeikou', name_jp: '二盃口', han_closed: 3, han_open: null },
    ];
    
    const meldTypes = ['shuntsu', 'minkou', 'ankou', 'minkan', 'ankan'];
    const meldNames = ['順子', '明刻', '暗刻', '明槓', '暗槓'];
    
    const initialMelds = Array(4).fill({ type: 'shuntsu', isYaochu: false });

    let gameState = {
        isOya: true, honba: 0, dora: 0, uraDora: 0, akaDora: 0, sangenpai: 0, bakaze: 0, jikaze: 0,
        isRiichi: false, isIppatsu: false, isMenzen: true, winMethod: 'tsumo', showFuBreakdown: false,
        yakuSelected: [],
        fuConditions: {
            wait: 'ryanmen', pair: 'non_value', melds: JSON.parse(JSON.stringify(initialMelds))
        },
        options: { kiriageMangan: true, }
    };

    const DOMElements = {
        playerStatusBtn: document.getElementById('player-status-btn'),
        yakuListContainer: document.getElementById('yaku-list-container'),
        clearBtn: document.getElementById('clear-btn'),
        hanResultEl: document.getElementById('han-result'),
        fuResultEl: document.getElementById('fu-result'),
        scoreResultEl: document.getElementById('score-result'),
        scoreBreakdownTitleEl: document.getElementById('score-breakdown-title'),
        fuDetailsSection: document.getElementById('fu-details'),
        meldsContainer: document.getElementById('melds-container'),
        riichiCheck: document.getElementById('riichi-check'),
        ippatsuCheck: document.getElementById('ippatsu-check'),
        fuCheck: document.getElementById('fu-check'),
        fuBreakdownEl: document.getElementById('fu-breakdown')
    };
    
    function init() {
        populateYakuList();
        populateMelds();
        setupEventListeners();
        updateUIFromState();
        calculateAndDisplay();
    }

    function populateYakuList() {
        DOMElements.yakuListContainer.innerHTML = yakuData
            .sort((a, b) => (a.han_closed || a.han_open) - (b.han_closed || b.han_open) || a.name_jp.localeCompare(b.name_jp))
            .map(yaku => {
                const hanValue = `${yaku.han_closed || yaku.han_open}飜`;
                return `<label class="yaku-label cursor-pointer"><input type="checkbox" value="${yaku.id}" class="hidden yaku-checkbox"><div class="p-2 border border-slate-200 rounded-lg text-center h-full flex flex-col justify-between"><span class="text-sm font-semibold">${yaku.name_jp}</span><span class="han-badge text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 mt-1">${hanValue}</span></div></label>`;
            }).join('');
    }

    function populateMelds() {
        for(let i=0; i<4; i++) {
            const meldDiv = document.createElement('div');
            meldDiv.className = 'flex items-center gap-2 p-2 bg-slate-100 rounded-lg';
            meldDiv.innerHTML = `<button data-meld-index="${i}" class="meld-type-btn p-2 rounded-md bg-white shadow-sm font-semibold text-sm flex-grow text-center"></button><button data-meld-index="${i}" class="meld-tile-btn p-2 rounded-md bg-white shadow-sm font-semibold text-xs">么九牌</button>`;
            DOMElements.meldsContainer.appendChild(meldDiv);
        }
    }

    function setupEventListeners() {
        DOMElements.playerStatusBtn.addEventListener('click', () => { gameState.isOya = !gameState.isOya; updateAndCalculate(); });
        document.querySelectorAll('.counter-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target; const isPlus = e.currentTarget.classList.contains('plus');
            gameState[target] = isPlus ? gameState[target] + 1 : Math.max(0, gameState[target] - 1);
            updateAndCalculate();
        }));
        DOMElements.riichiCheck.addEventListener('change', (e) => { gameState.isRiichi = e.target.checked; updateAndCalculate(); });
        DOMElements.ippatsuCheck.addEventListener('change', (e) => { gameState.isIppatsu = e.target.checked; updateAndCalculate(); });
        DOMElements.fuCheck.addEventListener('change', (e) => { gameState.showFuBreakdown = e.target.checked; updateAndCalculate(); });
        DOMElements.yakuListContainer.addEventListener('change', (e) => {
            if(e.target.classList.contains('yaku-checkbox')){ gameState.yakuSelected = Array.from(document.querySelectorAll('.yaku-checkbox:checked')).map(el => el.value); handleYakuDependencies(); updateAndCalculate(); }
        });
        document.querySelectorAll('input[name="winMethod"], input[name="menzen"], input[name="wait"], input[name="pair"]').forEach(radio => radio.addEventListener('change', () => {
            gameState.winMethod = document.querySelector('input[name="winMethod"]:checked').value;
            gameState.isMenzen = document.querySelector('input[name="menzen"]:checked').value === 'true';
            gameState.fuConditions.wait = document.querySelector('input[name="wait"]:checked').value;
            gameState.fuConditions.pair = document.querySelector('input[name="pair"]:checked').value;
            handleMenzenChange(); updateAndCalculate();
        }));
        DOMElements.meldsContainer.addEventListener('click', (e) => {
            const target = e.target; const index = target.dataset.meldIndex; if (index === undefined) return;
            if (target.classList.contains('meld-type-btn')) {
                const currentType = gameState.fuConditions.melds[index].type; const currentIndex = meldTypes.indexOf(currentType);
                const nextIndex = (currentIndex + 1) % meldTypes.length; gameState.fuConditions.melds[index].type = meldTypes[nextIndex];
            } else if (target.classList.contains('meld-tile-btn')) { gameState.fuConditions.melds[index].isYaochu = !gameState.fuConditions.melds[index].isYaochu; }
            updateMeldButtons(); updateAndCalculate();
        });
        DOMElements.clearBtn.addEventListener('click', resetAll);
    }
    
    function handleYakuDependencies() {
        const selectedSet = new Set(gameState.yakuSelected);
        if (selectedSet.has('chiitoitsu') || selectedSet.has('pinfu')) {
            document.querySelector('input[name="menzen"][value="true"]').checked = true;
            gameState.isMenzen = true; handleMenzenChange();
        }
    }
    
    function handleMenzenChange() {
        const menzen = gameState.isMenzen;
        document.querySelectorAll('.yaku-checkbox').forEach(cb => {
            const yaku = yakuData.find(y => y.id === cb.value);
            if (yaku && yaku.han_open === null && !menzen) {
                cb.checked = false; cb.disabled = true; cb.parentElement.classList.add('opacity-50', 'cursor-not-allowed');
            } else { cb.disabled = false; cb.parentElement.classList.remove('opacity-50', 'cursor-not-allowed'); }
        });
        gameState.yakuSelected = Array.from(document.querySelectorAll('.yaku-checkbox:checked')).map(el => el.value);
        updateRadioStyles();
    }

    function updateAndCalculate() { updateUIFromState(); calculateAndDisplay(); }

    function calculateAndDisplay() {
        const { totalHan } = calculateHan();
        const { finalFu, breakdown } = calculateFu();
        displayResults(totalHan, finalFu, breakdown);
    }

    function calculateHan() {
        let totalHan = 0; const selectedSet = new Set(gameState.yakuSelected);
        selectedSet.forEach(id => { const yaku = yakuData.find(y => y.id === id); if (yaku) { totalHan += gameState.isMenzen ? (yaku.han_closed || 0) : (yaku.han_open || 0); } });
        if (gameState.isRiichi) totalHan += 1; if (gameState.isIppatsu) totalHan += 1;
        totalHan += gameState.sangenpai + gameState.bakaze + gameState.jikaze;
        totalHan += gameState.dora + gameState.uraDora + gameState.akaDora;
        return { totalHan };
    }

    function calculateFu() {
        const selectedSet = new Set(gameState.yakuSelected); const breakdown = [];
        if(selectedSet.has('chiitoitsu')) { DOMElements.fuDetailsSection.classList.add('opacity-30'); return { finalFu: 25, breakdown: [{fu: 25, reason: '七對子特殊計算'}] }; }
        const pinfuConditionsMet = selectedSet.has('pinfu') && gameState.isMenzen && gameState.fuConditions.wait === 'ryanmen' && !['sangenpai', 'jikaze', 'bakaze', 'renhouhai'].includes(gameState.fuConditions.pair) && gameState.fuConditions.melds.every(m => m.type === 'shuntsu');
        if(pinfuConditionsMet) { DOMElements.fuDetailsSection.classList.add('opacity-30'); if (gameState.winMethod === 'tsumo') return { finalFu: 20, breakdown: [{fu: 20, reason: '平和自摸'}] }; if (gameState.winMethod === 'ron') return { finalFu: 30, breakdown: [{fu: 30, reason: '平和榮和'}] }; }
        DOMElements.fuDetailsSection.classList.remove('opacity-30');
        let fu = 20; breakdown.push({fu: 20, reason: '底符'});
        if (gameState.winMethod === 'tsumo' && !pinfuConditionsMet) { fu += 2; breakdown.push({fu: 2, reason: '自摸'}); }
        if (gameState.winMethod === 'ron' && gameState.isMenzen) { fu += 10; breakdown.push({fu: 10, reason: '門清榮和'}); }
        const waitType = gameState.fuConditions.wait;
        if (['kanchan', 'penchan', 'tanki'].includes(waitType)) { fu += 2; const waitReason = {'kanchan': '嵌張聽', 'penchan': '邊張聽', 'tanki': '單騎聽'}; breakdown.push({fu: 2, reason: waitReason[waitType]}); }
        const pairType = gameState.fuConditions.pair;
        if (['sangenpai', 'jikaze', 'bakaze'].includes(pairType)) { fu += 2; const pairReason = {'sangenpai': '役牌雀頭', 'jikaze': '自風雀頭', 'bakaze': '場風雀頭'}; breakdown.push({fu: 2, reason: pairReason[pairType]}); }
        if (pairType === 'renhouhai') { fu += 4; breakdown.push({fu: 4, reason: '連風雀頭'}); }
        gameState.fuConditions.melds.forEach(meld => {
            const isYaochu = meld.isYaochu; let meldFu = 0; let reason = '';
            switch (meld.type) {
                case 'minkou': meldFu = isYaochu ? 4 : 2; reason = isYaochu ? '么九明刻' : '明刻'; break;
                case 'ankou':  meldFu = isYaochu ? 8 : 4; reason = isYaochu ? '么九暗刻' : '暗刻'; break;
                case 'minkan': meldFu = isYaochu ? 16 : 8; reason = isYaochu ? '么九明槓' : '明槓'; break;
                case 'ankan':  meldFu = isYaochu ? 32 : 16; reason = isYaochu ? '么九暗槓' : '暗槓'; break;
            }
            if (meldFu > 0) { fu += meldFu; breakdown.push({fu: meldFu, reason}); }
        });
        if (!gameState.isMenzen && fu === 20 && gameState.winMethod === 'ron') return { finalFu: 30, breakdown: [{fu: 30, reason: '副露平和型'}] };
        if (fu === 20) return { finalFu: 20, breakdown: [{fu: 20, reason: '底符'}] };
        const finalFu = Math.ceil(fu / 10) * 10;
        return { finalFu, breakdown, rawFu: fu };
    }

    function getScore(han, fu) {
        if (han === 0) return { ron: 0, tsumo_ko: 0, tsumo_oya: 0 };
        const ceil100 = (val) => Math.ceil(val / 100) * 100; let basePoints;
        if (han >= 13) basePoints = 8000; else if (han >= 11) basePoints = 6000; else if (han >= 8) basePoints = 4000;
        else if (han >= 6) basePoints = 3000; else if (han >= 5) basePoints = 2000;
        else { if (gameState.options.kiriageMangan && ((han === 4 && fu >= 30) || (han === 3 && fu >= 60))) { basePoints = 2000; } else { basePoints = fu * Math.pow(2, han + 2); if (basePoints > 2000) basePoints = 2000; } }
        let scores = {};
        if (gameState.isOya) { scores.ron = ceil100(basePoints * 6); scores.tsumo_ko = ceil100(basePoints * 2); scores.tsumo_oya = 0; }
        else { scores.ron = ceil100(basePoints * 4); scores.tsumo_ko = ceil100(basePoints * 1); scores.tsumo_oya = ceil100(basePoints * 2); }
        if(gameState.honba > 0){ scores.ron += gameState.honba * 300; scores.tsumo_ko += gameState.honba * 100; if(scores.tsumo_oya > 0) scores.tsumo_oya += gameState.honba * 100; }
        return scores;
    }

    function displayResults(han, fu, breakdown) {
        DOMElements.hanResultEl.textContent = han; DOMElements.fuResultEl.textContent = fu;
        if (gameState.showFuBreakdown && breakdown) {
            const breakdownText = breakdown.map(item => `${item.fu}(${item.reason})`).join(' + ');
            const rawFu = breakdown.reduce((sum, item) => sum + item.fu, 0);
            if (fu !== rawFu && fu > 20) {
                DOMElements.fuBreakdownEl.textContent = `${breakdownText} = ${rawFu} → ${fu}符`;
            } else {
                DOMElements.fuBreakdownEl.textContent = breakdownText;
            }
            DOMElements.fuBreakdownEl.classList.remove('opacity-0');
        } else {
            DOMElements.fuBreakdownEl.classList.add('opacity-0');
        }
        if (han === 0) { DOMElements.scoreResultEl.innerHTML = `請選擇和牌條件`; DOMElements.scoreBreakdownTitleEl.textContent = `點數支付`; return; }
        const scores = getScore(han, fu); let scoreText = '';
        let titleText = `${gameState.isOya ? '莊家' : '子家'} ${gameState.winMethod === 'ron' ? '榮和' : '自摸'}`;
        if (gameState.winMethod === 'ron') { scoreText = `<div class='w-full'>放銃者支付 <strong class='text-4xl text-white'>${scores.ron.toLocaleString()}</strong></div>`; }
        else { if (gameState.isOya) { scoreText = `<div class='w-full'>每位子家支付 <strong class='text-4xl text-white'>${scores.tsumo_ko.toLocaleString()}</strong></div>`; } else { scoreText = `<div class='text-center w-full'><div class='mb-2'>子家支付 <strong class='text-3xl text-white'>${scores.tsumo_ko.toLocaleString()}</strong></div><div>莊家支付 <strong class='text-3xl text-white'>${scores.tsumo_oya.toLocaleString()}</strong></div></div>`; } }
        DOMElements.scoreBreakdownTitleEl.innerHTML = titleText; DOMElements.scoreResultEl.innerHTML = scoreText;
    }

    function updateUIFromState() {
        DOMElements.playerStatusBtn.textContent = gameState.isOya ? '莊家 (Oya)' : '子家 (Ko)';
        DOMElements.playerStatusBtn.className = `w-full mt-2 p-3 rounded-lg font-bold text-white control-button ${gameState.isOya ? 'bg-emerald-500' : 'bg-sky-500'}`;
        for(const key of ['honba', 'dora', 'uraDora', 'akaDora', 'sangenpai', 'bakaze', 'jikaze']){ document.getElementById(`${key}-display`).value = gameState[key]; }
        DOMElements.riichiCheck.checked = gameState.isRiichi; DOMElements.ippatsuCheck.checked = gameState.isIppatsu; DOMElements.fuCheck.checked = gameState.showFuBreakdown;
        document.querySelectorAll('.yaku-checkbox').forEach(cb => { cb.checked = gameState.yakuSelected.includes(cb.value); });
        document.querySelector(`input[name="winMethod"][value="${gameState.winMethod}"]`).checked = true;
        document.querySelector(`input[name="menzen"][value="${gameState.isMenzen}"]`).checked = true;
        document.querySelector(`input[name="wait"][value="${gameState.fuConditions.wait}"]`).checked = true;
        document.querySelector(`input[name="pair"][value="${gameState.fuConditions.pair}"]`).checked = true;
        updateRadioStyles(); updateMeldButtons(); handleMenzenChange();
    }

    function updateRadioStyles() {
        document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
            const label = input.closest('.yaku-label'); if (!label) return;
            const div = label.querySelector('div');
            if (input.checked) { div.classList.add('bg-green-500', 'text-white'); } else { div.classList.remove('bg-green-500', 'text-white'); }
        });
    }
    
    function updateMeldButtons() {
        document.querySelectorAll('.meld-type-btn').forEach((btn, i) => { const meld = gameState.fuConditions.melds[i]; const typeName = meldNames[meldTypes.indexOf(meld.type)]; btn.textContent = typeName; });
        document.querySelectorAll('.meld-tile-btn').forEach((btn, i) => { btn.classList.toggle('active', gameState.fuConditions.melds[i].isYaochu); });
    }

    function resetAll() {
        gameState = {
            isOya: true, honba: 0, dora: 0, uraDora: 0, akaDora: 0, sangenpai: 0, bakaze: 0, jikaze: 0,
            isRiichi: false, isIppatsu: false, isMenzen: true, winMethod: 'tsumo', showFuBreakdown: false,
            yakuSelected: [], fuConditions: { wait: 'ryanmen', pair: 'non_value', melds: JSON.parse(JSON.stringify(initialMelds)) },
            options: { kiriageMangan: true }
        };
        updateAndCalculate();
    }

    init();
});