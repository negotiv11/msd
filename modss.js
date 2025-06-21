// ==UserScript==
// @name          NEREST PROJECT Mr.Negotiv
// @namespace     http://tampermonkey.net/
// @version       MONSTER
// @description   Полный
// @author        NEREST PROJECT
// @match         https://nightly.dynast.cloud/
// @match         *://dynast.io/*
// @icon          https://img.pikbest.com/origin/10/42/57/55cpIkbEsTvzx.png!w700wp
// @grant         none
// @run-at        document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- Переменные для управления функциями (Настройки по умолчанию и те, что регулируются меню) ---
    let timeMachineAndAutoEActive = false; // Единый флаг для активности TimeMachine и Auto E (управляется пробелом)
    let currentSpeed = 1; // Текущий множитель скорости для TimeMachine
    let randomSpeedEnabled = true; // Random Speed ВКЛЮЧЁН по умолчанию
    let autoEIntervalMs = 0; // Интервал для Auto E (предустановленное значение, без слайдера в меню)
    let showFpsDisplay = true; // Отображать FPS
    let showPingDisplay = true; // Отображать пинг
    let fpsPingFontSize = 13; // Размер шрифта для FPS/Ping (предустановленное значение 13px)
    let displayCorner = 'top-left'; // Угол отображения FPS/Ping (предустановленное значение, без селектора в меню)
    let pingUpdateIntervalMs = 1000; // Интервал обновления пинга в мс (предустановленное значение)

    let adaptiveAutoEIntervalEnabled = false; // Включение/выключение адаптивного интервала Auto E (по умолчанию выключено)
    let ePressesPerTick = 10; // Количество нажатий 'E' за один такт (по умолчанию 10)

    // --- Переменные для YouTube Audio Player ---
    let player; // Объект YouTube плеера
    let youtubeVideoId = localStorage.getItem('youtubeVideoId') || ''; // ID последнего видео
    let youtubeVolume = parseFloat(localStorage.getItem('youtubeVolume')) || 0.5; // Громкость (0.0 - 1.0)
    let youtubePlayerReady = false; // Флаг готовности плеера

    (function() {
    'use strict'; // Использование строгого режима для лучшей производительности и отлова ошибок

    var uid = 0;
    var storage = {};
    var firstCall = true;
    var slice = Array.prototype.slice;
    var message = String.fromCharCode(0); // Используем null-символ как разделитель

    function fastApply(args) {
        var func = args[0];
        switch (args.length) {
            case 1:
                // Передаем просто performance.now() без лишних вычислений.
                // В большинстве случаев requestAnimationFrame ожидает именно это.
                return func(performance.now());
            case 2:
                return func(args[1]);
            case 3:
                return func(args[1], args[2]);
            default:
                // Для всех остальных случаев используем apply
                return func.apply(window, slice.call(args, 1));
        }
    }

    function callback(event) {
        // Проверяем источник сообщения, чтобы избежать обработки чужих сообщений
        if (event.source !== window || typeof event.data !== 'string' || event.data.indexOf(message) !== 0) {
            return;
        }

        var key = event.data;
        var data = storage[key];
        if (data) {
            delete storage[key];
            fastApply(data);
        }
    }

    function setImmediate() {
        var id = uid++;
        var key = message + id;
        var i = arguments.length;
        var args = new Array(i);
        while (i--) {
            args[i] = arguments[i];
        }
        storage[key] = args;

        if (firstCall) {
            firstCall = false;
            // Используем capture: true для уверенности, что обработчик сработает раньше.
            // Хотя в данном случае это, вероятно, не критично.
            window.addEventListener('message', callback, { capture: true });
        }
        window.postMessage(key, '*'); // Указываем '*' для targetOrigin, что является стандартом
        return id;
    }

    function clearImmediate(id) {
        delete storage[message + id];
    }

    // Переопределяем requestAnimationFrame и cancelAnimationFrame
    window.requestAnimationFrame = function(callback) {
        return setImmediate(callback);
    };

    window.cancelAnimationFrame = function(id) {
        clearImmediate(id);
    };
})();

    // --- Скрипт TimeMachine ---
    let lastPNow = performance.now();
    let pNowOffset = 0;

    let lastD = Date.now();
    let dOffset = 0;
    let lastRAF_tm = performance.now();
    let rAFOffset = 0;
    let randomSpeedIntervalId;

    const MIN_RANDOM_SPEED = 1.0;
    const MAX_RANDOM_SPEED = 5.0;
    const RANDOM_SPEED_CHANGE_INTERVAL_MS = 50;

    const originalPerformanceNow = window.performance.now;
    const originalDateNow = window.Date.now;
    const originalDateConstructor = window.Date;
    const originalRequestAnimationFrame_tm = window.requestAnimationFrame;

    let originalRAF_for_fps_calculation = window.requestAnimationFrame;

    function applyTimeMachineProxies() {
        if (!timeMachineAndAutoEActive) return;

        console.log(" Применяю прокси. Текущая скорость:", currentSpeed.toFixed(2));

        window.performance.now = new Proxy(originalPerformanceNow, {
            apply: function(target, thisArg, argList) {
                const time = Reflect.apply(target, thisArg, argList);
                pNowOffset += (time - lastPNow) * (currentSpeed - 1);
                lastPNow = time;
                const newTime = time + pNowOffset;
                return newTime;
            }
        });

        window.Date.now = new Proxy(originalDateNow, {
            apply: function(target, thisArg, argList) {
                const time = Reflect.apply(target, thisArg, argList);
                dOffset += (time - lastD) * (currentSpeed - 1);
                lastD = time;
                const newTime = time + dOffset;
                return Math.floor(newTime);
            }
        });

        window.Date = new Proxy(originalDateConstructor, {
            apply: function(target, thisArg, argList) {
                const time = Date.now();
                dOffset += (time - lastD) * (currentSpeed - 1);
                lastD = time;
                const newTime = time + dOffset;
                if (argList.length === 0) {
                    return Reflect.construct(target, [Math.min(newTime, 8640000000000000)]);
                }
                return Reflect.construct(target, argList);
            },
            construct: function(target, argList) {
                if (argList[0] === undefined) {
                    const time = Date.now();
                    dOffset += (time - lastD) * (currentSpeed - 1);
                    lastD = time;
                    const newTime = time + dOffset;
                    argList.push(Math.min(newTime, 8640000000000000));
                }
                return Reflect.construct(target, argList);
            }
        });

        window.requestAnimationFrame = new Proxy(originalRequestAnimationFrame_tm, {
            apply: function(target, thisArg, argList) {
                if (typeof argList[0] === "function") {
                    const originalCallback = argList[0];
                    argList[0] = function(time) {
                        rAFOffset += (time - lastRAF_tm) * (currentSpeed - 1);
                        lastRAF_tm = time;
                        const newTime = time + rAFOffset;
                        originalCallback(newTime);
                    };
                }
                return Reflect.apply(target, thisArg, argList);
            }
        });
    }

    function resetTimeMachineProxies() {
        window.performance.now = originalPerformanceNow;
        window.Date.now = originalDateNow;
        window.Date = originalDateConstructor;
        window.requestAnimationFrame = originalRequestAnimationFrame_tm;
        pNowOffset = 0;
        dOffset = 0;
        rAFOffset = 0;
        console.log(" Прокси сброшены.");
    }

    function startRandomSpeed() {
        if (randomSpeedIntervalId) clearInterval(randomSpeedIntervalId);
        randomSpeedIntervalId = setInterval(() => {
            currentSpeed = Math.random() * (MAX_RANDOM_SPEED - MIN_RANDOM_SPEED) + MIN_RANDOM_SPEED;
            console.log("Текущая случайная скорость времени:", currentSpeed.toFixed(2));
        }, RANDOM_SPEED_CHANGE_INTERVAL_MS);
    }

    function stopRandomSpeed() {
        if (randomSpeedIntervalId) {
            clearInterval(randomSpeedIntervalId);
            randomSpeedIntervalId = null;
        }
        console.log("Случайная скорость остановлена.");
    }

    // --- Конец скрипта TimeMachine ---


    // --- Скрипт i++ dog пробел ---
    window.autoEKey = " ";

    let autoEIntervalId;
    const cache = new Map();

    function startBothFeatures() {
        if (!timeMachineAndAutoEActive) {
            timeMachineAndAutoEActive = true;
            applyTimeMachineProxies();

            if (randomSpeedEnabled) {
                startRandomSpeed();
            } else {
                applyTimeMachineProxies(); // Убедиться, что скорость равна 1, если случайная скорость выключена
            }

            updateStatusDisplay("ON");
            startAutoEInterval(); // Вызываем новую функцию для запуска интервала Auto E
            console.log("[TM] Оба функционала активированы.");
        }
    }

    function stopBothFeatures() {
        if (timeMachineAndAutoEActive) {
            timeMachineAndAutoEActive = false;
            clearInterval(autoEIntervalId);
            stopRandomSpeed();

            //currentSpeed = 1; // Всегда сбрасывать скорость к 1 при деактивации
            resetTimeMachineProxies();
            updateFpsPingDisplay(currentCalculatedFps, currentPing, "OFF");
            console.log("[TM] Оба функционала  деактивированы.");
        }
    }

    // НОВАЯ ФУНКЦИЯ: Запуск интервала Auto E с учетом адаптивности
    function startAutoEInterval() {
        if (autoEIntervalId) clearInterval(autoEIntervalId); // Очищаем предыдущий интервал, если был

        let intervalToUse = autoEIntervalMs; // По умолчанию используем фиксированный интервал

        if (adaptiveAutoEIntervalEnabled) {
            // Пример адаптивной логики: чем выше пинг, тем больше интервал (чтобы избежать потери команд)
            // При пинге ниже 100 мс, интервал 0 для максимально быстрой работы
            if (currentPing > 100) {
                intervalToUse = currentPing / 2; // Можно настроить формулу под свой пинг
            } else {
                intervalToUse = 0; // Для низкого пинга - без задержки
            }
            console.log(`[AutoE] Адаптивный интервал: ${intervalToUse.toFixed(0)} мс (исходя из пинга ${currentPing.toFixed(0)} мс)`);
        } else {
             console.log(`[AutoE] Фиксированный интервал: ${intervalToUse.toFixed(0)} мс`);
        }

        autoEIntervalId = setInterval(() => {
            executeECommands();
            executeOtherCommands();
        }, intervalToUse);
    }


    function executeECommands() {
        hX3();
    }

    function hX3() {
        const eH9 = { key: 'e', code: 'KeyE', bubbles: true, cancelable: true };
        for (let i = 0; i < ePressesPerTick; i++) { // Использование ePressesPerTick
            document.dispatchEvent(new KeyboardEvent('keydown', eH9));
            document.dispatchEvent(new KeyboardEvent('keyup', eH9));
        }
    }

    function executeOtherCommands() {
        Promise.all([
            fJ0(), pD3(), wB2(), vO8(), gH6(),
            jV4(), xD0(), bZ8(), sY7(), dP9(),
            uO2(), aJ4(), kV5(), commandQueueProcessing(),
            complexCalculations(), cacheProcessing([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            factorial(10), determinant([[1, 2], [3, 4]]),
            quickSort([3, 5, 1, 4, 2]), sieveOfEratosthenes(100),
            isPrime(29)
        ]);
    }

    // Вспомогательные функции (оставлены без изменений)
    function fJ0() { /* hX3(); */ }
    function pD3() { /* hX3(); */ }
    function wB2() { /* hX3(); */ }
    function vO8() { let kM1 = Math.log(3); if (kM1 > 1) {} /* hX3(); */ }
    function gH6() { /* hX3(); */ }
    function jV4() { let yQ2 = 120; if (yQ2 % 2 === 0) {} /* hX3(); */ }
    function xD0() { let dR1 = Math.log(2); let pQ0 = Math.exp(0); if ((dR1 + pQ0) % 2 === 0) {} /* hX3(); */ }
    function bZ8() { let kS4 = 0.5; if (kS4 > 0.2) {} /* hX3(); */ }
    function sY7() { let kF2 = 90; if (kF2 < 180) {} /* hX3(); */ }
    function dP9() { /* hX3(); */ }
    function uO2() { let xR6 = 0.6; if (xR6 > 0.5) {} /* hX3(); */ }
    function aJ4() { let sL0 = 0; for (let i = 0; i < 500; i++) { sL0 += Math.sin(i * Math.PI / 360) * Math.cos(i * Math.PI / 180); } if ( sL0 % 2 === 0) {} /* hX3(); */ }
    function kV5() { let lR6 = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]]; let zL1 = lR6[0][0] * lR6[1][1] * lR6[2][2]; for (let i = 0; i < 25; i++) { zL1 = zL1 * Math.sin(i * Math.PI / 180); } if (zL1 > 0.5) {} /* hX3(); */ }
    function commandQueueProcessing() { const queue = Array(100).fill(1); let sum = 0; for (let i = 0; i < queue.length; i++) { sum += (queue[i] * i) % 256; } return sum; }
    function complexCalculations() { let result = 1; for (let i = 0; i < 100; i++) { result *= Math.sin(1) * Math.cos(1); result += Math.tan(1); } return result; }
    function cacheProcessing(data) {
        const dataString = JSON.stringify(data);
        if (cache.has(dataString)) { return cache.get(dataString); }
        let processed = data.map(x => x * Math.sin(x)); cache.set(dataString, processed); return processed;
    }
    function factorial(n) { if (n === 0 || n === 1) return 1; return n * factorial(n - 1); }
    function determinant(matrix) { const n = matrix.length; if (n === 1) return matrix[0][0]; if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]; let det = 0; for (let i = 0; i < n; i++) { const subMatrix = matrix.slice(1).map(row => row.filter((_, j) => j !== i)); det += ((i % 2 === 0 ? 1 : -1) * matrix[0][i] * determinant(subMatrix)); } return det; }
    function quickSort(arr) { if (arr.length <= 1) return arr; const pivot = arr[arr.length - 1]; const left = arr.filter(x => x < pivot); const right = arr.filter(x => x > pivot); return [...quickSort(left), pivot, ...quickSort(right)]; }
    function sieveOfEratosthenes(n) { const primes = []; const isPrime = Array(n + 1).fill(true); isPrime[0] = isPrime[1] = false; for (let i = 2; i <= n; i++) { if (isPrime[i]) { primes.push(i); for (let j = i * 2; j <= n; j += i) { isPrime[j] = false; } } } return primes; }
    function isPrime(num) { if (num <= 1) return false; if (num <= 3) return true; if (num % 2 === 0 || num % 3 === 0) return false; for (let i = 5; i * i <= num; i += 6) { if (num % i === 0 || num % (i + 2) === 0) return false; } return true; }

    // --- Конец скрипта i++ dog пробел ---


    // --- Модуль отображения FPS и Пинга ---
    let fpsPingDisplayElement;
    let lastFrameTime_fps = performance.now();
    let frameCount_fps = 0;
    let currentCalculatedFps = 0;
    let currentPing = 0;
    let pingIntervalId;

    function createOrUpdateFpsPingDisplay() {
        if (!fpsPingDisplayElement) {
            fpsPingDisplayElement = document.createElement('div');
            fpsPingDisplayElement.id = 'tampermonkey-fps-ping-display';
            Object.assign(fpsPingDisplayElement.style, {
    position: 'fixed',
    background: 'linear-gradient(135deg, #0f0f0f, #1a1a1a)',
    backgroundImage: 'url("https://i.gifer.com/5IUl.gif")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backgroundBlendMode: 'overlay',
    border: '2px solid #00ff88',
    boxShadow: '0 0 25px #00ff88, 0 0 15px #00ff88 inset',
    color: 'white',
    fontFamily: '"Orbitron", monospace',
    padding: '8px 12px',
    borderRadius: '10px',
    zIndex: '9999',
    pointerEvents: 'none',
    textAlign: 'center',
    minWidth: '140px',
    boxSizing: 'border-box',
    fontSize: `${fpsPingFontSize}px`
});
            document.body.appendChild(fpsPingDisplayElement);
        }

        // Применяем предустановленные значения, так как эти элементы удалены из меню
        applyDisplayCorner(displayCorner);
        fpsPingDisplayElement.style.fontSize = `${fpsPingFontSize}px`;

        if (showFpsDisplay || showPingDisplay) {
            fpsPingDisplayElement.style.display = 'block';
            updateFpsPingDisplay(currentCalculatedFps, currentPing, timeMachineAndAutoEActive ? "ON" : "OFF");
        } else {
            fpsPingDisplayElement.style.display = 'none';
        }
    }

    function updateFpsPingDisplay(fps, ping, status) {
        if (fpsPingDisplayElement && (showFpsDisplay || showPingDisplay)) {
            let displayText = "";
            if (showFpsDisplay) {
                displayText += `FPS BOOST: ${fps.toFixed(0)}\n`;
            }
            if (showPingDisplay) {
                displayText += `Internet: ${ping.toFixed(0)} ms\n`;
            }
            displayText += `NEREST SCRIPT: ${status}`;
            fpsPingDisplayElement.textContent = displayText;
            fpsPingDisplayElement.style.whiteSpace = 'pre';
        }
    }

    window.requestAnimationFrame = new Proxy(originalRAF_for_fps_calculation, {
        apply: function(target, thisArg, argList) {
            frameCount_fps++;
            const currentTime = performance.now();
            const elapsed = currentTime - lastFrameTime_fps;

            if (elapsed >= 1000) {
                const fps = (frameCount_fps / elapsed) * 1000;
                currentCalculatedFps = fps;
                updateFpsPingDisplay(fps, currentPing, timeMachineAndAutoEActive ? "ON" : "OFF");
                frameCount_fps = 0;
                lastFrameTime_fps = currentTime;
            }
            return Reflect.apply(target, thisArg, argList);
        }
    });

    function updateStatusDisplay(status) {
        if (fpsPingDisplayElement) {
            updateFpsPingDisplay(currentCalculatedFps, currentPing, status);
        }
    }

    function measurePing() {
        const startTime = performance.now();
        fetch(window.location.origin + '/favicon.ico', { mode: 'no-cors' })
            .then(() => {
                currentPing = performance.now() - startTime;
                updateFpsPingDisplay(currentCalculatedFps, currentPing, timeMachineAndAutoEActive ? "ON" : "OFF");
                // Если адаптивный интервал включен, обновить интервал Auto E
                if (timeMachineAndAutoEActive && adaptiveAutoEIntervalEnabled) {
                    startAutoEInterval(); // Перезапустить интервал с новым пингом
                }
            })
            .catch(() => {
                currentPing = NaN;
                updateFpsPingDisplay(currentCalculatedFps, currentPing, timeMachineAndAutoEActive ? "ON" : "OFF");
            });
    }

    function startPingMeasurement() {
        if (pingIntervalId) clearInterval(pingIntervalId);
        if (showPingDisplay && pingUpdateIntervalMs > 0) {
            measurePing();
            pingIntervalId = setInterval(measurePing, pingUpdateIntervalMs);
        }
    }

    function stopPingMeasurement() {
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        currentPing = 0;
        updateFpsPingDisplay(currentCalculatedFps, currentPing, timeMachineAndAutoEActive ? "ON" : "OFF");
    }

    function applyDisplayCorner(corner) {
        const styles = {
            'top-left': { top: '10px', left: '10px', right: 'auto', bottom: 'auto' },
            'top-right': { top: '10px', right: '10px', left: 'auto', bottom: 'auto' },
            'bottom-left': { bottom: '10px', left: '10px', top: 'auto', right: 'auto' },
            'bottom-right': { bottom: '10px', right: '10px', top: 'auto', left: 'auto' }
        };
        Object.assign(fpsPingDisplayElement.style, styles[corner]);
    }

    // --- Конец модуля отображения FPS и Пинга ---


    // --- Модуль YouTube Audio Player ---
    let youtubePlayerContainer;

    function createYouTubePlayerContainer() {
        if (!youtubePlayerContainer) {
            youtubePlayerContainer = document.createElement('div');
            youtubePlayerContainer.id = 'youtube-player-container';
            Object.assign(youtubePlayerContainer.style, {
                position: 'fixed',
                top: '-9999px', // Скрываем контейнер за пределами экрана
                left: '-9999px',
                width: '1px', // Минимальные размеры
                height: '1px',
                overflow: 'hidden',
                zIndex: '-1' // На всякий случай за всем остальным
            });
            document.body.appendChild(youtubePlayerContainer);
        }
    }

    // Загрузка YouTube IFrame Player API
    function loadYouTubeIframeAPI() {
        if (typeof YT === 'undefined' || !YT.Player) {
            console.log("[YouTube Player] Загружаю YouTube IFrame Player API...");
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api"; // Использование HTTPS для API
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            console.log("[YouTube Player] YouTube IFrame Player API уже загружен.");
            youtubePlayerReady = true;
            // Если API уже загружен и есть ID видео, сразу пытаемся создать плеер
            if (youtubeVideoId) {
                createYouTubePlayer();
            }
        }
    }

    // Эта функция вызывается YouTube API, когда он загружен
    window.onYouTubeIframeAPIReady = function() {
        console.log("[YouTube Player] YouTube IFrame Player API готов.");
        youtubePlayerReady = true;
        // Если уже есть ID видео, создаем плеер
        if (youtubeVideoId) {
            createYouTubePlayer();
        }
    };

    function extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    function createYouTubePlayer() {
        if (!youtubePlayerReady || !youtubePlayerContainer || !youtubeVideoId) {
            console.warn("[YouTube Player] Не могу создать плеер: API не готов, контейнер отсутствует или ID видео не задан.");
            return;
        }
        if (player) {
            player.destroy(); // Уничтожаем старый плеер, если он есть
            player = null;
            // Очищаем контейнер от старого iframe
            youtubePlayerContainer.innerHTML = '';
        }

        player = new YT.Player(youtubePlayerContainer.id, {
            videoId: youtubeVideoId,
            playerVars: {
                'autoplay': 0, // Не автовоспроизводить сразу
                'controls': 0, // Без элементов управления
                'disablekb': 1, // Отключить управление с клавиатуры
                'fs': 0, // Отключить полноэкранный режим
                'loop': 1, // Зациклить видео (нужно также 'playlist' если видео одно)
                'playlist': youtubeVideoId, // Обязательно для зацикливания одного видео
                'modestbranding': 1, // Уменьшить брендинг YouTube
                'rel': 0, // Не показывать похожие видео в конце
                'showinfo': 0, // Не показывать информацию о видео
                'autohide': 1,
                'mute': 0, // Изначально не заглушать
                'iv_load_policy': 3 // Не показывать аннотации
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
        console.log(`[YouTube Player] Создан плеер для ID: ${youtubeVideoId}`);
    }

    function onPlayerReady(event) {
        console.log("[YouTube Player] Плеер готов!");
        event.target.setVolume(youtubeVolume * 100); // Установить громкость
        // event.target.playVideo(); // Можно автовоспроизводить здесь, если нужно
    }

    function onPlayerStateChange(event) {
        // console.log("[YouTube Player] Состояние плеера изменилось:", event.data);
    }

    function onPlayerError(event) {
        console.error("[YouTube Player] Ошибка плеера:", event.data);
        let errorMessage = `Ошибка воспроизведения YouTube видео. Код: ${event.data}.\n`;
        if (event.data === 2) {
            errorMessage += "Неверный ID видео. Проверьте правильность URL.";
        } else if (event.data === 100) {
            errorMessage += "Видео не найдено. Возможно, оно удалено или является приватным.";
        } else if (event.data === 101 || event.data === 150) {
            errorMessage += "Встраивание видео запрещено его владельцем. Попробуйте другое видео.";
        } else {
            errorMessage += "Неизвестная ошибка.";
        }
        alert(errorMessage); // Оставляем alert для ошибок, так как это важно для пользователя
        stopYouTubeVideo(); // Останавливаем плеер при ошибке
        youtubeUrlInput.value = ''; // Очищаем поле ввода
        youtubeVideoId = '';
        localStorage.removeItem('youtubeVideoId');
    }

    function playYouTubeVideo() {
        if (!player || !youtubePlayerReady || !youtubeVideoId) {
            console.warn("[YouTube Player] Не могу воспроизвести: плеер не готов, API не загружен или ID видео не задан.");
            if (youtubeVideoId && youtubePlayerReady) {
                createYouTubePlayer(); // Попытаемся создать плеер, если ID есть и API готов
            }
            return;
        }

        const playerState = player.getPlayerState();

        if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED || playerState === YT.PlayerState.CUED) {
            // Если видео на паузе, закончилось или загружено и готово - просто продолжаем воспроизведение
            player.playVideo();
            console.log(`[YouTube Player] Возобновляю воспроизведение видео ID: ${youtubeVideoId}`);
        } else if (playerState !== YT.PlayerState.PLAYING && playerState !== YT.PlayerState.BUFFERING) {
            // Если видео не играет и не буферизуется (например, если ID изменился или это первое воспроизведение)
            player.setVolume(youtubeVolume * 100); // Установить громкость перед загрузкой
            player.loadVideoById(youtubeVideoId); // Загружаем новое видео
            // playVideo() будет вызван в onPlayerReady после загрузки видео
            console.log(`[YouTube Player] Загружаю и воспроизвожу видео ID: ${youtubeVideoId}`);
        }
        // Если уже играет или буферизуется, ничего не делаем.
    }

    function pauseYouTubeVideo() {
        if (player && player.pauseVideo) {
            player.pauseVideo();
            console.log("[YouTube Player] Видео на паузе.");
        }
    }

    function stopYouTubeVideo() {
        if (player) {
            if (player.stopVideo) {
                player.stopVideo();
            }
            player.destroy(); // Уничтожаем плеер полностью
            player = null;
            youtubePlayerContainer.innerHTML = ''; // Очищаем контейнер
            console.log("[YouTube Player] Видео остановлено и плеер уничтожен.");
        }
    }

    function setYouTubeVolume(volume) {
        youtubeVolume = volume;
        localStorage.setItem('youtubeVolume', youtubeVolume);
        if (player && player.setVolume) {
            player.setVolume(volume * 100);
        }
        console.log(`[YouTube Player] Громкость установлена: ${volume.toFixed(2)}`);
    }

    function clearYouTubeUrl() {
        youtubeUrlInput.value = '';
        youtubeVideoId = '';
        localStorage.removeItem('youtubeVideoId');
        stopYouTubeVideo(); // Останавливаем и уничтожаем плеер
        console.log("[YouTube Player] YouTube URL очищен.");
        // alert() сообщение было удалено здесь
    }

    // НОВЫЕ ФУНКЦИИ ДЛЯ ПЕРЕМОТКИ
    function rewindYouTubeVideo(seconds) {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            player.seekTo(currentTime - seconds, true); // true означает, что плеер будет играть после перемотки
            console.log(`[YouTube Player] Перемотка назад на ${seconds} секунд. Текущее время: ${player.getCurrentTime().toFixed(1)}`);
        } else {
            console.warn("[YouTube Player].");
        }
    }

    function forwardYouTubeVideo(seconds) {
        if (player && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            player.seekTo(currentTime + seconds, true); // true означает, что плеер будет играть после перемотки
            console.log(`[YouTube Player] Перемотка вперед на ${seconds} секунд. Текущее время: ${player.getCurrentTime().toFixed(1)}`);
        } else {
            console.warn("[YouTube Player]");
        }
    }

    // --- Конец модуля YouTube Audio Player ---


    // --- Меню ---
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%) scale(0)';
    menu.style.transition = 'transform 0.4s ease, opacity 0.4s ease, box-shadow 0.3s ease';
    menu.style.opacity = '0';
    menu.style.background = 'linear-gradient(135deg, #0f0f0f, #1a1a1a)';
menu.style.border = '2px solid lime';
menu.style.boxShadow = '0 0 25px lime, 0 0 10px lime inset';
    menu.style.color = 'white';
    menu.style.padding = '25px';
    menu.style.borderRadius = '12px';
    menu.style.boxShadow = '0 0 25px lime, 0 0 10px lime inset';
    menu.style.zIndex = '10000';
    menu.style.textAlign = 'left';
    menu.style.backgroundImage = 'url("https://i.gifer.com/VhkF.gif")';
menu.style.backgroundSize = 'cover';
menu.style.backgroundPosition = 'center';
menu.style.backgroundRepeat = 'no-repeat';
menu.style.backgroundColor = 'rgba(0,0,0,0.8)';
menu.style.backgroundBlendMode = 'overlay';

menu.style.border = '2px solid #00ff88';
menu.style.boxShadow = '0 0 25px #00ff88, 0 0 15px #00ff88 inset';
    menu.style.display = 'flex';
menu.style.flexWrap = 'wrap';
menu.style.justifyContent = 'space-between';
    menu.style.alignItems = 'flex-start';
    menu.style.fontFamily = '"Orbitron", Arial, sans-serif';
    menu.style.width = '720px';
    menu.style.maxHeight = '80%';
    menu.style.overflowY = 'auto';

    // HTML-структура меню
    menu.innerHTML = `
        <span style="display: block; text-align: right; color: rgba(255,255,255,0.7); font-size: 10px; margin-bottom: 5px;">NEREST PROJECT|By Mr.Negotiv|By HiroOnes|telegram: @nerest_skripts</span>
        <h2 style="margin: 0 0 15px 0; font-size: 30px; font-weight: bold; text-align: center; color: #00ff00; text-shadow: 0 0 5px #0f0;">👾 MONSTER PANEL 👾</h2>

        <div style="width: 48%; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">NerestMachine</h3>
            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <span>Множитель: <span id="timeSpeedValue">1.0</span>x</span>
                <input type="range" id="timeSpeedSlider" min="0.1" max="10" step="0.1" value="1" style="width: 150px;">
            </label>
            <label style="display: flex; align-items: center; font-size: 14px;">
                <input type="checkbox" id="randomSpeedToggle" ${randomSpeedEnabled ? 'checked' : ''} style="margin-right: 8px;">
                <span>Случайная скорость</span>
            </label>
        </div>

        <div style="width: 48%; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">Auto E</h3>
            <label style="display: flex; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <input type="checkbox" id="adaptiveAutoEIntervalToggle" ${adaptiveAutoEIntervalEnabled ? 'checked' : ''} style="margin-right: 8px;">
                <span>Ауто Настройка(по пингу интернета)</span>
            </label>
            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <span>Повторений(типо скорости): <span id="ePressesPerTickValue">10</span></span>
                <input type="range" id="ePressesPerTickSlider" min="1" max="20" step="1" value="10" style="width: 150px;">
            </label>
        </div>

        <div style="width: 48%; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">FPS/MS</h3>
            <label style="display: flex; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <input type="checkbox" id="showFpsToggle" ${showFpsDisplay ? 'checked' : ''} style="margin-right: 8px;">
                <span>Показывать fps?</span>
            </label>
            <label style="display: flex; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <input type="checkbox" id="showPingToggle" ${showPingDisplay ? 'checked' : ''} style="margin-right: 8px;">
                <span>Показывать Internet ms?</span>
            </label>
        </div>

        <div style="width: 48%; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">YouTube Audio</h3>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-size: 14px;">URL видео YouTube:</label>
                <input type="text" id="youtubeUrlInput" placeholder="Введите URL видео" style="width: calc(100% - 10px); padding: 8px; border: 1px solid #444; background: #333; color: white; border-radius: 4px;">
            </div>
            <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px;">
                <span>Громкость: <span id="youtubeVolumeValue">50%</span></span>
                <input type="range" id="youtubeVolumeSlider" min="0" max="100" step="1" value="50" style="width: 150px;">
            </label>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <button id="playYoutubeVideo" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">Воспроизвести</button>
                <button id="pauseYoutubeVideo" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">Пауза</button>
                <button id="stopYoutubeVideo" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">Стоп</button>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <button id="rewindYoutubeVideo" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">-10 сек</button>
                <button id="forwardYoutubeVideo" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">+10 сек</button>
            </div>
            <button id="clearYoutubeUrl" style="flex: 1; padding: 8px 15px; background: linear-gradient(90deg, #00ff88, #00ccff); border: 2px solid #00ff88; color: black; text-shadow: 0 0 3px white; border-radius: 6px; cursor: pointer; box-shadow: 0 0 10px #00ff88; margin: 4px; font-weight: bold;">Очистить URL</button>
        </div>

        <button id="closeMenu" style="
            margin-top: 15px;
            padding: 8px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s ease;
        ">Закрыть</button>
    `;
    document.body.appendChild(menu);

    // --- Получение элементов меню ---
    const timeSpeedSlider = document.getElementById('timeSpeedSlider');
    const timeSpeedValue = document.getElementById('timeSpeedValue');
    const randomSpeedToggle = document.getElementById('randomSpeedToggle');
    const adaptiveAutoEIntervalToggle = document.getElementById('adaptiveAutoEIntervalToggle');
    const ePressesPerTickSlider = document.getElementById('ePressesPerTickSlider');
    const ePressesPerTickValue = document.getElementById('ePressesPerTickValue');
    const showFpsToggle = document.getElementById('showFpsToggle');
    const showPingToggle = document.getElementById('showPingToggle');
    const closeMenuButton = document.getElementById('closeMenu');

    // Элементы YouTube плеера в меню
    const youtubeUrlInput = document.getElementById('youtubeUrlInput');
    const youtubeVolumeSlider = document.getElementById('youtubeVolumeSlider');
    const youtubeVolumeValue = document.getElementById('youtubeVolumeValue');
    const playYoutubeVideoBtn = document.getElementById('playYoutubeVideo');
    const pauseYoutubeVideoBtn = document.getElementById('pauseYoutubeVideo');
    const stopYoutubeVideoBtn = document.getElementById('stopYoutubeVideo');
    const clearYoutubeUrlBtn = document.getElementById('clearYoutubeUrl');
    // Новые кнопки для перемотки
    const rewindYoutubeVideoBtn = document.getElementById('rewindYoutubeVideo');
    const forwardYoutubeVideoBtn = document.getElementById('forwardYoutubeVideo');


    // --- Функции открытия и закрытия меню ---
    function openMenu() {
    const openSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_f4a15b5e37.mp3?filename=interface-124464.mp3');
    openSound.volume = 0.3;
    openSound.play();
        // Синхронизируем состояние всех элементов меню с текущими переменными
        timeSpeedSlider.value = currentSpeed;
        timeSpeedValue.textContent = currentSpeed.toFixed(1);
        randomSpeedToggle.checked = randomSpeedEnabled;
        adaptiveAutoEIntervalToggle.checked = adaptiveAutoEIntervalEnabled;
        ePressesPerTickSlider.value = ePressesPerTick;
        ePressesPerTickValue.textContent = ePressesPerTick;
        showFpsToggle.checked = showFpsDisplay;
        showPingToggle.checked = showPingToggle.checked;

        // Синхронизация для YouTube плеера
        youtubeUrlInput.value = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : '';
        youtubeVolumeSlider.value = youtubeVolume * 100;
        youtubeVolumeValue.textContent = `${(youtubeVolume * 100).toFixed(0)}%`;


        menu.style.transform = 'translate(-50%, -50%) scale(1)';
        menu.style.opacity = '1';
    }

    function closeMenu() {
        menu.style.transform = 'translate(-50%, -50%) scale(0)';
        menu.style.opacity = '0';
    }

    // --- Обработчики событий меню ---
    closeMenuButton.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Insert') {
            if (menu.style.opacity === '0') {
                openMenu();
            } else {
                closeMenu();
            }
        }
    });

    // Единый обработчик для пробела (включает/выключает Auto E и TimeMachine)
    document.addEventListener('keydown', (e) => {
        if (e.key === window.autoEKey && !timeMachineAndAutoEActive) {
            e.preventDefault();
            startBothFeatures();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === window.autoEKey && timeMachineAndAutoEActive) {
            e.preventDefault();
            stopBothFeatures();
        }
    });

    // Обработчики для элементов TimeMachine
    timeSpeedSlider.addEventListener('input', () => {
        currentSpeed = parseFloat(timeSpeedSlider.value);
        timeSpeedValue.textContent = currentSpeed.toFixed(1);
        if (timeMachineAndAutoEActive && !randomSpeedEnabled) {
            // Если скрипт активен и случайная скорость выключена, сразу применяем новую скорость
            resetTimeMachineProxies(); // Сброс для пересчета оффсетов с новой скоростью
            applyTimeMachineProxies();
        }
    });

    randomSpeedToggle.addEventListener('change', () => {
        randomSpeedEnabled = randomSpeedToggle.checked;
        if (timeMachineAndAutoEActive) {
            if (randomSpeedEnabled) {
                startRandomSpeed();
            } else {
                stopRandomSpeed();
                currentSpeed = parseFloat(timeSpeedSlider.value); // Применить значение из ползунка, когда random выключен
                resetTimeMachineProxies();
                applyTimeMachineProxies();
            }
        }
    });

    // ОБРАБОТЧИК: Адаптивный интервал Auto E
    adaptiveAutoEIntervalToggle.addEventListener('change', () => {
        adaptiveAutoEIntervalEnabled = adaptiveAutoEIntervalToggle.checked;
        if (timeMachineAndAutoEActive) {
            startAutoEInterval(); // Перезапустить интервал с учетом новой настройки
        }
    });

    // ОБРАБОТЧИК: Количество повторений 'E' за такт
    ePressesPerTickSlider.addEventListener('input', () => {
        ePressesPerTick = parseInt(ePressesPerTickSlider.value);
        ePressesPerTickValue.textContent = ePressesPerTick;
    });

    // Обработчики для дисплея FPS/Ping
    showFpsToggle.addEventListener('change', () => {
        showFpsDisplay = showFpsToggle.checked;
        createOrUpdateFpsPingDisplay(); // Обновить видимость
    });

    showPingToggle.addEventListener('change', () => {
        showPingDisplay = showPingToggle.checked;
        createOrUpdateFpsPingDisplay(); // Обновить видимость
        if (showPingDisplay) {
            startPingMeasurement();
        } else {
            stopPingMeasurement();
        }
    });

    // --- Обработчики для YouTube Audio Player ---
    youtubeUrlInput.addEventListener('input', () => {
        const url = youtubeUrlInput.value;
        const id = extractVideoId(url);
        if (id) {
            youtubeVideoId = id;
            localStorage.setItem('youtubeVideoId', youtubeVideoId);
            console.log(`[YouTube Player] Обнаружен ID видео: ${youtubeVideoId}`);
            if (youtubePlayerReady) {
                createYouTubePlayer(); // Пересоздаем плеер с новым ID
            }
        } else {
            youtubeVideoId = '';
            localStorage.removeItem('youtubeVideoId');
            console.warn("[YouTube Player] Не могу извлечь ID видео из URL. Плеер будет остановлен.");
            if (player) {
                stopYouTubeVideo(); // Остановить, если URL стал невалидным
            }
        }
    });

    youtubeVolumeSlider.addEventListener('input', () => {
        const volume = parseFloat(youtubeVolumeSlider.value) / 100;
        setYouTubeVolume(volume);
        youtubeVolumeValue.textContent = `${(volume * 100).toFixed(0)}%`;
    });

    playYoutubeVideoBtn.addEventListener('click', playYouTubeVideo);
    pauseYoutubeVideoBtn.addEventListener('click', pauseYouTubeVideo);
    stopYoutubeVideoBtn.addEventListener('click', stopYouTubeVideo);
    clearYoutubeUrlBtn.addEventListener('click', clearYouTubeUrl);
    // Привязываем новые кнопки перемотки
    rewindYoutubeVideoBtn.addEventListener('click', () => rewindYouTubeVideo(10));
    forwardYoutubeVideoBtn.addEventListener('click', () => forwardYouTubeVideo(10));


    // Инициализация при загрузке страницы
    window.addEventListener('load', () => {
        createOrUpdateFpsPingDisplay(); // Создать/обновить дисплей
        startPingMeasurement(); // Начать измерение пинга

        // Инициализация YouTube плеера
        createYouTubePlayerContainer();
        loadYouTubeIframeAPI(); // Загружаем API

        // Синхронизация значений меню при загрузке
        timeSpeedSlider.value = currentSpeed;
        timeSpeedValue.textContent = currentSpeed.toFixed(1);
        randomSpeedToggle.checked = randomSpeedEnabled;
        adaptiveAutoEIntervalToggle.checked = adaptiveAutoEIntervalEnabled;
        ePressesPerTickSlider.value = ePressesPerTick;
        ePressesPerTickValue.textContent = ePressesPerTick;
        showFpsToggle.checked = showFpsDisplay;
        showPingToggle.checked = showPingDisplay;

        // При загрузке страницы, если есть сохраненный ID, отображаем полный URL
        youtubeUrlInput.value = youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : '';
        youtubeVolumeSlider.value = youtubeVolume * 100;
        youtubeVolumeValue.textContent = `${(youtubeVolume * 100).toFixed(0)}%`;

        console.log("[TM] Script 'Auto E (Space).");
    });
})();
