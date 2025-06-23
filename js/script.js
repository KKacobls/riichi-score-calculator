document.addEventListener('DOMContentLoaded', () => {

    const yakuData = [
        { id: 'tsumo', name_jp: '門前清自摸和(1翻)', han_closed: 1, han_open: null }, 
        { id: 'pinfu', name_jp: '平和(1翻)', han_closed: 1, han_open: null },
        { id: 'tanyao', name_jp: '断么九(1翻)', han_closed: 1, han_open: 1 }, 
        { id: 'iipeikou', name_jp: '一盃口(1翻)', han_closed: 1, han_open: null },
        { id: 'rinshan', name_jp: '嶺上開花(1翻)', han_closed: 1, han_open: 1 }, 
        { id: 'chankan', name_jp: '槍槓(1翻)', han_closed: 1, han_open: 1 },
        { id: 'haitei', name_jp: '海底摸月/河底撈魚(1翻)', han_closed: 1, han_open: 1 },
        { id: 'sanshoku_doujun', name_jp: '三色同順(2翻)', han_closed: 2, han_open: 1 },
        { id: 'ikkitsuukan', name_jp: '一氣通貫(2翻)', han_closed: 2, han_open: 1 },
        { id: 'honchantaiyou', name_jp: '混全帶么九(2翻)', han_closed: 2, han_open: 1 },
        { id: 'chiitoitsu', name_jp: '七對子(2翻)', han_closed: 2, han_open: null },
        { id: 'toitoi', name_jp: '對對和(2翻)', han_closed: 2, han_open: 2 }, 
        { id: 'sanankou', name_jp: '三暗刻(2翻)', han_closed: 2, han_open: 2 },
        { id: 'sankantsu', name_jp: '三槓子(2翻)', han_closed: 2, han_open: 2 }, 
        { id: 'sanshoku_doukou', name_jp: '三色同刻(2翻)', han_closed: 2, han_open: 2 },
        { id: 'honroutou', name_jp: '混老頭(2翻)', han_closed: 2, han_open: 2 }, 
        { id: 'shousangen', name_jp: '小三元(2翻)', han_closed: 2, han_open: 2 },
        { id: 'junchan', name_jp: '純全帶么九(3翻)', han_closed: 3, han_open: 2 },
        { id: 'honitsu', name_jp: '混一色(3翻)', han_closed: 3, han_open: 2 },
        { id: 'ryanpeikou', name_jp: '二盃口(3翻)', han_closed: 3, han_open: null },
        { id: 'chinitsu', name_jp: '清一色(6翻)', han_closed: 6, han_open: 5 },
    ];
    
    const meldTypes = ['shuntsu', 'minkou', 'ankou', 'minkan', 'ankan'];
    const meldNames = ['順子', '明刻', '暗刻', '明槓', '暗槓'];
    
    const initialMelds = Array(4).fill({ type: 'shuntsu', isYaochu: false });

    let gameState = {};

    function getInitialGameState() {
        const initialState = {
            isOya: true, honba: 0, dora: 0, uraDora: 0, akaDora: 0, sangenpai: 0, bakaze: 0, jikaze: 0,
            isRiichi: false, isIppatsu: false, isMenzen: true, winMethod: 'tsumo', showFuBreakdown: false,
            yakuStates: {},
            fuConditions: {
                wait: 'ryanmen', pair: 'non_value', melds: JSON.parse(JSON.stringify(initialMelds))
            },
            options: { kiriageMangan: true, }
        };
        yakuData.forEach(yaku => {
            initialState.yakuStates[yaku.id] = 0;
        });
        return initialState;
    }

    const DOMElements = {
        yakuContainer: document.getElementById('yaku-container'),
        playerStatusBtn: document.getElementById('player-status-btn'),
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
        fuBreakdownEl: document.getElementById('fu-breakdown'),
        hanBreakdownList: document.getElementById('han-breakdown-list')
    };
    
    function init() {
        gameState = getInitialGameState();
        populateYakuList();
        populateMelds();
        setupEventListeners();
        updateUIFromState();
        calculateAndDisplay();
    }

    function populateYakuList() {
        const yakuHtml = yakuData
            .sort((a, b) => (a.han_closed || a.han_open) - (b.han_closed || b.han_open) || a.name_jp.localeCompare(b.name_jp))
            .map(yaku => `
                <button class="yaku-btn p-2 border border-slate-200 rounded-lg text-center h-full flex flex-col justify-center text-sm font-semibold" data-yaku-id="${yaku.id}">
                    ${yaku.name_jp}
                </button>
            `).join('');
        DOMElements.yakuContainer.innerHTML = yakuHtml;
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

        DOMElements.yakuContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.yaku-btn');
            if (!target) return;
            const yakuId = target.dataset.yakuId;
            const yaku = yakuData.find(y => y.id === yakuId);
            if (!yaku) return;

            let currentState = gameState.yakuStates[yakuId];
            let nextState = 0;

            if (yaku.han_open !== null && yaku.han_open < yaku.han_closed) { 
                if (currentState === 0) nextState = 1;      
                else if (currentState === 1) nextState = 2; 
                else nextState = 0;                         
            } else { 
                nextState = currentState === 0 ? 1 : 0; 
            }
            
            gameState.yakuStates[yakuId] = nextState;
            handleYakuDependencies();
            updateAndCalculate();
        });

        DOMElements.riichiCheck.addEventListener('change', (e) => { gameState.isRiichi = e.target.checked; updateAndCalculate(); });
        DOMElements.ippatsuCheck.addEventListener('change', (e) => { gameState.isIppatsu = e.target.checked; updateAndCalculate(); });
        DOMElements.fuCheck.addEventListener('change', (e) => { gameState.showFuBreakdown = e.target.checked; updateAndCalculate(); });

        document.querySelectorAll('input[name="winMethod"], input[name="menzen"]').forEach(radio => radio.addEventListener('change', () => {
            gameState.winMethod = document.querySelector('input[name="winMethod"]:checked').value;
            gameState.isMenzen = document.querySelector('input[name="menzen"]:checked').value === 'true';
            updateRadioStyles(); updateAndCalculate();
        }));
        document.querySelectorAll('input[name="wait"], input[name="pair"]').forEach(radio => radio.addEventListener('change', () => {
             gameState.fuConditions.wait = document.querySelector('input[name="wait"]:checked').value;
            gameState.fuConditions.pair = document.querySelector('input[name="pair"]:checked').value;
            updateAndCalculate();
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
        let needsMenzen = false;
        yakuData.forEach(yaku => {
            if (yaku.han_open === null && gameState.yakuStates[yaku.id] > 0) {
                needsMenzen = true;
            }
        });

        if (needsMenzen) {
            gameState.isMenzen = true;
        }

        if (gameState.yakuStates['tsumo'] > 0) {
            gameState.winMethod = 'tsumo';
        }
    }

    function updateAndCalculate() { updateUIFromState(); calculateAndDisplay(); }

    function calculateAndDisplay() {
        const { totalHan } = calculateHan();
        const { finalFu, breakdown } = calculateFu();
        displayResults(totalHan, finalFu, breakdown);
    }

    function calculateHan() {
        let totalHan = 0; 
        for (const yakuId in gameState.yakuStates) {
            const state = gameState.yakuStates[yakuId];
            if (state > 0) {
                const yaku = yakuData.find(y => y.id === yakuId);
                if (state === 1) { 
                    totalHan += yaku.han_closed;
                } else if (state === 2) {
                    totalHan += yaku.han_open;
                }
            }
        }

        if (gameState.isRiichi) totalHan += 1; if (gameState.isIppatsu) totalHan += 1;
        totalHan += gameState.sangenpai + gameState.bakaze + gameState.jikaze;
        totalHan += gameState.dora + gameState.uraDora + gameState.akaDora;
        return { totalHan };
    }

    function calculateFu() {
        const breakdown = [];
        if(gameState.yakuStates['chiitoitsu'] > 0) { DOMElements.fuDetailsSection.classList.add('opacity-30'); return { finalFu: 25, breakdown: [{fu: 25, reason: '七對子特殊計算'}] }; }
        const pinfuConditionsMet = gameState.yakuStates['pinfu'] > 0 && gameState.isMenzen && gameState.fuConditions.wait === 'ryanmen' && !['sangenpai', 'jikaze', 'bakaze', 'renhouhai'].includes(gameState.fuConditions.pair) && gameState.fuConditions.melds.every(m => m.type === 'shuntsu');
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

    function getHanBreakdown() {
        const breakdown = [];
        const { yakuStates, isRiichi, isIppatsu, sangenpai, bakaze, jikaze, dora, akaDora, uraDora } = gameState;

        for (const yakuId in yakuStates) {
            const state = yakuStates[yakuId];
            if (state > 0) {
                const yaku = yakuData.find(y => y.id === yakuId);
                let han = 0;
                let name = yaku.name_jp.split('(')[0];
                if (state === 1) { 
                    han = yaku.han_closed;
                } else if (state === 2) { 
                    han = yaku.han_open;
                }
                if (han > 0) breakdown.push({ reason: name, han: han });
            }
        }

        if (isRiichi) breakdown.push({ reason: '立直', han: 1 });
        if (isIppatsu) breakdown.push({ reason: '一發', han: 1 });
        if (sangenpai > 0) breakdown.push({ reason: '役牌：三元牌', han: sangenpai });
        if (bakaze > 0) breakdown.push({ reason: '役牌：場風', han: bakaze });
        if (jikaze > 0) breakdown.push({ reason: '役牌：自風', han: jikaze });
        if (dora > 0) breakdown.push({ reason: '寶牌', han: dora });
        if (akaDora > 0) breakdown.push({ reason: '赤寶牌', han: akaDora });
        if (uraDora > 0) breakdown.push({ reason: '裏寶牌', han: uraDora });
        
        return breakdown;
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

    function displayResults(han, fu, fuBreakdownData) {
        DOMElements.hanResultEl.textContent = han; DOMElements.fuResultEl.textContent = fu;

        if (gameState.showFuBreakdown && fuBreakdownData) {
            const breakdownText = fuBreakdownData.map(item => `${item.reason}${item.fu}`).join('+');
            const rawFu = fuBreakdownData.reduce((sum, item) => sum + item.fu, 0);
            DOMElements.fuBreakdownEl.textContent = (fu !== rawFu && fu > 20) ? `${breakdownText} = ${rawFu} → ${fu}符` : breakdownText;
            DOMElements.fuBreakdownEl.classList.remove('opacity-0');
        } else {
            DOMElements.fuBreakdownEl.classList.add('opacity-0');
        }

        const hanBreakdown = getHanBreakdown();
        if (hanBreakdown.length > 0) {
            const hanBreakdownHtml = hanBreakdown.map(item => `
                <div class="flex justify-between items-center text-slate-200">
                    <span>${item.reason}</span>
                    <span class="font-medium text-green-300">${item.han} 飜</span>
                </div>
            `).join('');
            DOMElements.hanBreakdownList.innerHTML = `<h3 class="font-semibold text-slate-300 mb-2 pb-1 border-b border-slate-700">飜數明細</h3><div class="space-y-1">${hanBreakdownHtml}</div>`;
        } else {
            DOMElements.hanBreakdownList.innerHTML = '';
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
        document.querySelector(`input[name="winMethod"][value="${gameState.winMethod}"]`).checked = true;
        document.querySelector(`input[name="menzen"][value="${gameState.isMenzen}"]`).checked = true;
        document.querySelector(`input[name="wait"][value="${gameState.fuConditions.wait}"]`).checked = true;
        document.querySelector(`input[name="pair"][value="${gameState.fuConditions.pair}"]`).checked = true;
        updateRadioStyles(); 
        updateMeldButtons(); 
        updateYakuButtons();
    }

    function updateYakuButtons() {
        document.querySelectorAll('.yaku-btn').forEach(btn => {
            const yakuId = btn.dataset.yakuId;
            const yaku = yakuData.find(y => y.id === yakuId);
            const state = gameState.yakuStates[yakuId];
            
            btn.classList.remove('state-1', 'state-2');
            let text = yaku.name_jp;
            
            if (state === 1) {
                btn.classList.add('state-1');
                text += ` ${yaku.han_closed}飜`;
            } else if (state === 2) {
                btn.classList.add('state-2');
                text += ` ${yaku.han_open}飜`;
            }
            btn.innerHTML = text;
        });
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
        gameState = getInitialGameState();
        updateAndCalculate();
    }

    init();
});