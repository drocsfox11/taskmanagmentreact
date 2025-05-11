import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";
import '../styles/components/EmojiPicker.css';

function EmojiPicker({ selectedEmoji, onSelectEmoji, isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [displayedEmojis, setDisplayedEmojis] = useState([]);
    const [allEmojis, setAllEmojis] = useState([]);
    const [filteredEmojis, setFilteredEmojis] = useState([]);
    const [totalEmojis, setTotalEmojis] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    const EMOJIS_PER_PAGE = 100;
    
    const pickerRef = useRef(null);
    const searchInputRef = useRef(null);
    const gridRef = useRef(null);
    const overlayRef = useRef(null);
    const sentinelRef = useRef(null);

    // Инициализация списка всех эмодзи
    useEffect(() => {
        const allEmojiKeys = Object.keys(emojiData);
        setAllEmojis(allEmojiKeys);
        setTotalEmojis(allEmojiKeys.length);
    }, []);

    // Загрузка первой страницы эмодзи при открытии
    useEffect(() => {
        if (isOpen) {
            setPage(0);
            loadInitialEmojis();
        }
    }, [isOpen]);

    // Инициализация пересечения для бесконечной подгрузки
    useEffect(() => {
        const options = {
            root: gridRef.current,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver(handleObserver, options);
        
        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }
        
        return () => {
            if (sentinelRef.current) {
                observer.unobserve(sentinelRef.current);
            }
        };
    }, [displayedEmojis]);

    // Функция наблюдателя за пересечением
    const handleObserver = useCallback((entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading) {
            loadMoreEmojis();
        }
    }, [isLoading, filteredEmojis, searchQuery]);

    // Загрузка первой партии эмодзи
    const loadInitialEmojis = useCallback(() => {
        if (searchQuery.trim() === '') {
            const initialEmojis = allEmojis.slice(0, EMOJIS_PER_PAGE);
            setDisplayedEmojis(initialEmojis);
            setFilteredEmojis(allEmojis);
        } else {
            handleSearch(searchQuery);
        }
    }, [allEmojis, searchQuery]);

    // Загрузка следующей партии эмодзи
    const loadMoreEmojis = useCallback(() => {
        if (isLoading) return;
        
        setIsLoading(true);
        
        setTimeout(() => {
            const currentEmojis = searchQuery.trim() === '' ? allEmojis : filteredEmojis;
            const nextPage = page + 1;
            const start = 0;
            const end = Math.min((nextPage + 1) * EMOJIS_PER_PAGE, currentEmojis.length);
            
            if (end > displayedEmojis.length) {
                const newEmojis = currentEmojis.slice(start, end);
                setDisplayedEmojis(newEmojis);
                setPage(nextPage);
            }
            
            setIsLoading(false);
        }, 300);
    }, [page, displayedEmojis, allEmojis, filteredEmojis, searchQuery, isLoading]);

    // Обработка поиска
    const handleSearch = useCallback((query) => {
        const trimmedQuery = query.trim().toLowerCase();
        
        if (trimmedQuery === '') {
            // Если поиск пустой, показываем первую страницу всех эмодзи
            setFilteredEmojis(allEmojis);
            setDisplayedEmojis(allEmojis.slice(0, EMOJIS_PER_PAGE));
            setTotalEmojis(allEmojis.length);
            setPage(0);
        } else {
            // Фильтруем эмодзи по поисковому запросу
            const filtered = allEmojis.filter(
                emojiName => emojiName.toLowerCase().includes(trimmedQuery)
            );
            
            setFilteredEmojis(filtered);
            setDisplayedEmojis(filtered.slice(0, EMOJIS_PER_PAGE));
            setTotalEmojis(filtered.length);
            setPage(0);
        }
        
        // Прокручиваем грид в начало при изменении поискового запроса
        if (gridRef.current) {
            gridRef.current.scrollTop = 0;
        }
    }, [allEmojis]);
    
    // Обработчик изменения поля поиска
    const handleSearchChange = (event) => {
        const newQuery = event.target.value;
        setSearchQuery(newQuery);
        handleSearch(newQuery);
    };
    
    // Фокус на поле поиска при открытии
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current.focus();
            }, 100);
        }
    }, [isOpen]);

    // Обработка нажатия клавиши Escape
    useEffect(() => {
        function handleEscapeKey(event) {
            if (event.key === 'Escape') {
                onClose();
            }
        }
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscapeKey);
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

    // Закрытие пикера при клике вне его
    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                isOpen &&
                overlayRef.current === event.target && // Клик только по оверлею (фону), не по контенту
                pickerRef.current && 
                !pickerRef.current.contains(event.target)
            ) {
                onClose();
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose]);

    // Обработчик выбора эмодзи
    const handleEmojiClick = (emojiName, event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectEmoji(emojiName);
        onClose();
    };

    // Обработчик закрытия по кнопке
    const handleCloseButtonClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
    };

    // Если пикер закрыт, не рендерим компонент
    if (!isOpen) return null;
    
    // Заголовок для отображения
    const getResultsTitle = () => {
        if (searchQuery.trim() !== '') {
            if (totalEmojis === 0) {
                return 'Ничего не найдено';
            }
            return `Найдено ${totalEmojis} ${getWordForm(totalEmojis, ['эмодзи', 'эмодзи', 'эмодзи'])}`;
        }
        
        return `Все эмодзи (${totalEmojis})`;
    };
    
    // Склонение слов
    function getWordForm(number, words) {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
    }

    return (
        <div className="emoji-picker-overlay" ref={overlayRef} onMouseDown={(e) => e.target === overlayRef.current && onClose()}>
            <div className="emoji-picker-container" ref={pickerRef}>
                <div className="emoji-picker-header">
                    <h3>Выберите иконку</h3>
                    <button className="emoji-picker-close" onMouseDown={handleCloseButtonClick}>×</button>
                </div>
                
                <div className="emoji-picker-search">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Поиск эмодзи..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
                
                <div className="emoji-grid-header">
                    <h4>{getResultsTitle()}</h4>
                    <span className="emoji-displayed-count">
                        Показано: {displayedEmojis.length} из {totalEmojis}
                    </span>
                </div>
                
                <div className="emoji-picker-grid" ref={gridRef} onMouseDown={(e) => e.stopPropagation()}>
                    <EmojiProvider data={emojiData}>
                        {displayedEmojis.length > 0 ? (
                            <>
                                {displayedEmojis.map(emojiName => (
                                    <div 
                                        key={emojiName} 
                                        className={`emoji-item ${selectedEmoji === emojiName ? 'selected' : ''}`}
                                        onMouseDown={(e) => handleEmojiClick(emojiName, e)}
                                        title={emojiName}
                                    >
                                        <Emoji name={emojiName} width={24} />
                                    </div>
                                ))}
                                {displayedEmojis.length < (searchQuery.trim() === '' ? allEmojis.length : filteredEmojis.length) && (
                                    <div ref={sentinelRef} className="emoji-sentinel">
                                        {isLoading && (
                                            <div className="emoji-loading-indicator">
                                                Загрузка...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="emoji-search-no-results">
                                Попробуйте другой поисковый запрос
                            </div>
                        )}
                    </EmojiProvider>
                </div>
            </div>
        </div>
    );
}

export default EmojiPicker; 