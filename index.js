import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';

const TOTAL_BOXES = 150;
const STALE_DAYS_THRESHOLD = 30;

// --- HELPER FUNCTIONS ---

const getInitialData = () => {
    // Standarddaten für eine leere Datenbank
    return {
        boxes: Array.from({ length: TOTAL_BOXES }, (_, i) => ({ id: i + 1 })),
        varieties: ['Allians', 'Antonia', 'Ditta', 'Gunda', 'Hermes', 'Laura', 'Otolia', 'Princess', 'Quarta'],
        sortings: ['<35', '35-65', '>65', 'Feldfallend', 'Futterkartoffeln', 'Pflanzgut'].sort(),
        fillLevels: ['100%', '75%', '50%', '25%'],
        customTraits: [],
    };
};


const getBoxStatus = (box) => {
  if (!box.date) {
    return 'default';
  }
  const dateStored = new Date(box.date);
  const today = new Date();
  dateStored.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dateStored.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > STALE_DAYS_THRESHOLD) {
    return 'stale';
  }
  return 'updated';
};

const getGermanStatus = (status) => {
    switch (status) {
        case 'default': return 'Leer';
        case 'updated': return 'Aktualisiert';
        case 'stale': return 'Überfällig';
        default: return '';
    }
};

const VARIETY_COLORS = {
  // Gelbtöne
  'Princess': '#fdd835', // Yellow
  'Allians': '#fbc02d',
  'Ditta': '#f9a825',
  'Gunda': '#f57f17', 
  
  // Grüntöne
  'Antonia': '#9ccc65', 
  'Otolia': '#7cb342',
  
  // Rottöne
  'Laura': '#ef5350', 
  'Quarta': '#d32f2f',
  
  // Blautöne
  'Hermes': '#42a5f5',
};

const getBoxStyle = (box) => {
  const status = getBoxStatus(box);

  // Status colors have priority
  if (status === 'default') {
    return { backgroundColor: 'var(--box-default)' }; 
  }
  if (status === 'stale') {
    return { backgroundColor: 'var(--box-stale)' }; 
  }

  // If updated, use variety color
  if (box.varieties && box.varieties.length > 0) {
    const firstVariety = box.varieties[0];
    const color = VARIETY_COLORS[firstVariety];
    if (color) {
      return { backgroundColor: color };
    }
  }

  // Fallback to default updated color
  return { backgroundColor: 'var(--box-updated)' };
};

// --- REACT COMPONENTS ---

const LoadingScreen = ({ message }) => (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>{message}</p>
  </div>
);

const ErrorScreen = ({ error }) => (
    <div className="error-container">
        <h2>Initialisierungsfehler</h2>
        <p>Die Anwendung konnte nicht korrekt geladen werden.</p>
        <pre className="error-message">{error}</pre>
    </div>
);


const Dashboard = (props) => {
  const { 
    boxes, onBoxClick, filters, onFilterChange, onGoToManage, onGoToSummary,
    multiSelectMode, onToggleMultiSelectMode, selectedBoxIds, onGoToBulkEdit
  } = props;
  
  const selectedCount = selectedBoxIds.length;

  return (
    <div>
      <div className="dashboard-header">
        <h1>Kartoffelkisten-Manager</h1>
        <div className="header-buttons">
          <button 
            className={`btn ${multiSelectMode ? 'btn-active' : 'btn-secondary'}`}
            onClick={onToggleMultiSelectMode}
          >
            {multiSelectMode ? 'Auswahl abbrechen' : 'Mehrfachauswahl'}
          </button>
          <button className="btn btn-secondary" onClick={onGoToSummary}>Zusammenfassung</button>
          <button className="btn btn-secondary" onClick={onGoToManage}>Daten verwalten</button>
        </div>
      </div>
      <div className="box-grid" role="grid">
        {boxes.map((box) => (
          <button
            key={box.id}
            style={getBoxStyle(box)}
            className={`box-btn ${selectedBoxIds.includes(box.id) ? 'selected' : ''}`}
            onClick={() => onBoxClick(box.id)}
            aria-label={`Kiste ${box.id}, Status: ${getGermanStatus(getBoxStatus(box))}`}
            aria-pressed={selectedBoxIds.includes(box.id)}
          >
            {box.id}
          </button>
        ))}
      </div>
      <div className="dashboard-controls">
        <div className="control-group">
          <label htmlFor="search-kiste">Suche nach Kisten-Nr.</label>
          <input
            id="search-kiste"
            type="text"
            placeholder="z.B. 42"
            value={filters.searchTerm}
            onChange={(e) => onFilterChange('searchTerm', e.target.value)}
            disabled={multiSelectMode}
          />
        </div>
        <div className="control-group">
          <label htmlFor="filter-variety">Nach Sorte filtern</label>
          <select
            id="filter-variety"
            value={filters.varietyFilter}
            onChange={(e) => onFilterChange('varietyFilter', e.target.value)}
            disabled={multiSelectMode}
          >
            <option value="">Alle Sorten</option>
            {filters.allVarieties.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="filter-sorting">Nach Sortierung filtern</label>
          <select
            id="filter-sorting"
            value={filters.sortingFilter}
            onChange={(e) => onFilterChange('sortingFilter', e.target.value)}
            disabled={multiSelectMode}
          >
            <option value="">Alle Sortierungen</option>
            {filters.allSortings.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="control-group">
          <label htmlFor="filter-fill-level">Nach Füllstand filtern</label>
          <select
            id="filter-fill-level"
            value={filters.fillLevelFilter}
            onChange={(e) => onFilterChange('fillLevelFilter', e.target.value)}
            disabled={multiSelectMode}
          >
            <option value="">Alle Füllstände</option>
            {filters.allFillLevels.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      {multiSelectMode && selectedCount > 0 && (
        <div className="bulk-actions-bar">
            <span>{selectedCount} Kiste{selectedCount > 1 ? 'n' : ''} ausgewählt</span>
            <button className="btn btn-primary" onClick={onGoToBulkEdit}>Ausgewählte Kisten bearbeiten</button>
        </div>
      )}
    </div>
  );
};

const OptionGrid = ({ label, options, selectedValues = [], onToggle, multiSelect = false, labelAction }) => {
  if (!options || options.length === 0) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <p className="no-options-text">Keine Optionen verfügbar. Fügen Sie sie auf der Seite "Daten verwalten" hinzu.</p>
      </div>
    );
  }

  const role = multiSelect ? 'group' : 'radiogroup';
  
  return (
    <div className="form-group">
      {labelAction ? (
        <div className="label-with-action">
          <label>{label}</label>
          {labelAction}
        </div>
      ) : (
        <label>{label}</label>
      )}
      <div className="option-grid" role={role} aria-label={label}>
        {options.map(option => {
          const isSelected = selectedValues.includes(option);
          return (
            <button
              key={option}
              type="button"
              role={multiSelect ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              className={`option-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DataEntryScreen = ({ box, onSave, onClear, onBack, varieties, sortings, fillLevels, customTraits }) => {
  const [formData, setFormData] = useState({
    varieties: box.varieties || [],
    sorting: box.sorting || '',
    date: box.date || new Date().toISOString().split('T')[0],
    fillLevel: box.fillLevel || '100%',
    customTraits: box.customTraits || {}
  });
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isVarietyMultiSelectActive, setIsVarietyMultiSelectActive] = useState((box.varieties?.length ?? 0) > 1);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleVarietyToggle = (toggledVariety) => {
    setFormData(prev => {
        const currentVarieties = prev.varieties || [];
        let newVarieties;

        if (isVarietyMultiSelectActive) {
            newVarieties = currentVarieties.includes(toggledVariety)
                ? currentVarieties.filter(v => v !== toggledVariety)
                : [...currentVarieties, toggledVariety];
        } else {
            newVarieties = [toggledVariety];
        }

        const wasEmpty = (box.varieties?.length ?? 0) === 0;
        const isNowNotEmpty = newVarieties.length > 0;
        const shouldSetDefaultSorting = wasEmpty && isNowNotEmpty && !prev.sorting;

        return {
            ...prev,
            varieties: newVarieties,
            sorting: shouldSetDefaultSorting ? 'Feldfallend' : prev.sorting
        };
    });
  };

  const handleToggleVarietyMode = () => {
    setIsVarietyMultiSelectActive(prev => {
        const willBeSingleMode = prev;
        if (willBeSingleMode) {
            setFormData(curr => ({
                ...curr,
                varieties: (curr.varieties?.length ?? 0) > 0 ? [curr.varieties[0]] : []
            }));
        }
        return !prev;
    });
  };


  const handleSortingSelect = (value) => {
    setFormData(prev => ({ ...prev, sorting: value }));
  };

  const handleFillLevelSelect = (value) => {
    setFormData(prev => ({ ...prev, fillLevel: value }));
  };
  
  const handleCustomTraitChange = (traitName, value) => {
    setFormData(prev => ({
        ...prev,
        customTraits: {
            ...(prev.customTraits || {}),
            [traitName]: value
        }
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(box.id, formData);
  };

  const handleClear = () => {
    setIsConfirmingClear(true);
  };
  
  const handleConfirmClear = () => {
      onClear(box.id);
  }

  const varietyLabelAction = (
    <button type="button" className="btn-link" onClick={handleToggleVarietyMode}>
        {isVarietyMultiSelectActive ? 'Einzelauswahl' : 'Mehrere Sorten'}
    </button>
  );

  return (
    <div className="data-entry-screen">
      <h2>Kiste #{box.id} bearbeiten</h2>
      <form onSubmit={handleSave}>
        <OptionGrid
          label="Sorte"
          options={varieties}
          selectedValues={formData.varieties}
          onToggle={handleVarietyToggle}
          multiSelect={isVarietyMultiSelectActive}
          labelAction={varietyLabelAction}
        />
        
        <OptionGrid
          label="Sortierung"
          options={sortings}
          selectedValues={formData.sorting ? [formData.sorting] : []}
          onToggle={handleSortingSelect}
        />
        
        <OptionGrid
          label="Füllstand"
          options={fillLevels}
          selectedValues={formData.fillLevel ? [formData.fillLevel] : []}
          onToggle={handleFillLevelSelect}
        />

        {customTraits.map(trait => (
          <OptionGrid
            key={trait.name}
            label={trait.name}
            options={trait.options}
            selectedValues={formData.customTraits?.[trait.name] ? [formData.customTraits[trait.name]] : []}
            onToggle={(value) => handleCustomTraitChange(trait.name, value)}
          />
        ))}

        <div className="form-group">
          <label htmlFor="date">Datum</label>
          <input type="date" id="date" name="date" value={formData.date} onChange={handleDateChange} required />
        </div>
        <div className="button-group">
          <button type="button" className="btn btn-secondary" onClick={onBack}>Zurück zum Dashboard</button>
          <div className="action-buttons">
            {isConfirmingClear ? (
               <div className="confirm-group">
                 <span className="confirm-delete-text">Sind Sie sicher?</span>
                 <button type="button" className="btn btn-danger" onClick={handleConfirmClear}>Bestätigen</button>
                 <button type="button" className="btn btn-secondary" onClick={() => setIsConfirmingClear(false)}>Abbrechen</button>
               </div>
            ) : (
                <button type="button" className="btn btn-danger" onClick={handleClear}>Kiste leeren</button>
            )}
            <button type="submit" className="btn btn-primary">Änderungen speichern</button>
          </div>
        </div>
      </form>
    </div>
  );
};


const BulkEditScreen = (props) => {
    const { selectedBoxIds, onBulkSave, onBulkClear, onBack, varieties, sortings, fillLevels, customTraits } = props;
    
    const [formData, setFormData] = useState({
      varieties: [],
      sorting: 'Feldfallend',
      fillLevel: '100%',
      date: new Date().toISOString().split('T')[0],
      customTraits: {}
    });
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    const handleVarietyToggle = (toggledVariety) => {
        setFormData(prev => {
            const currentVarieties = prev.varieties || [];
            const newVarieties = currentVarieties.includes(toggledVariety)
                ? currentVarieties.filter(v => v !== toggledVariety)
                : [...currentVarieties, toggledVariety];
            return { ...prev, varieties: newVarieties };
        });
    };

    const handleSelect = (fieldName, value, traitName) => {
        if (fieldName === 'customTrait' && traitName) {
            setFormData(prev => ({
                ...prev,
                customTraits: {
                    ...(prev.customTraits || {}),
                    [traitName]: prev.customTraits?.[traitName] === value ? '' : value
                }
            }));
        } else if (fieldName === 'sorting') {
            setFormData(prev => ({...prev, sorting: prev.sorting === value ? '' : value}));
        } else if (fieldName === 'fillLevel') {
            setFormData(prev => ({...prev, fillLevel: prev.fillLevel === value ? '' : value}));
        }
    };

    const handleDateChange = (e) => {
        setFormData(prev => ({...prev, date: e.target.value}));
    };

    const handleSave = (e) => {
        e.preventDefault();
        
        const dataToSave = {};

        if (formData.varieties && formData.varieties.length > 0) {
            dataToSave.varieties = formData.varieties;
        }
        if (formData.sorting) {
            dataToSave.sorting = formData.sorting;
        }
        if (formData.fillLevel) {
            dataToSave.fillLevel = formData.fillLevel;
        }
        if (formData.date) {
            dataToSave.date = formData.date;
        }

        const nonEmptyCustomTraits = Object.entries(formData.customTraits || {}).reduce((acc, [key, value]) => {
            if (value) {
                acc[key] = value;
            }
            return acc;
        }, {});

        if (Object.keys(nonEmptyCustomTraits).length > 0) {
            dataToSave.customTraits = nonEmptyCustomTraits;
        }
        
        onBulkSave(dataToSave);
    };
    
    return (
        <div className="bulk-edit-screen">
            <h2>{selectedBoxIds.length} Kisten en gros bearbeiten</h2>
            <div className="form-group">
                <label>Ausgewählte Kisten:</label>
                <div className="selected-boxes-list">
                    {selectedBoxIds.sort((a,b) => a-b).join(', ')}
                </div>
            </div>

            <form onSubmit={handleSave}>
                <p className="bulk-edit-info">Felder sind mit Vorschlägen vorausgefüllt. Klicken Sie eine Auswahl erneut, um sie zu leeren. Nur Felder mit einem Wert werden übernommen.</p>
                
                <OptionGrid
                    label="Sorte"
                    options={varieties}
                    selectedValues={formData.varieties}
                    onToggle={handleVarietyToggle}
                    multiSelect
                />
                <OptionGrid
                    label="Sortierung"
                    options={sortings}
                    selectedValues={formData.sorting ? [formData.sorting] : []}
                    onToggle={(value) => handleSelect('sorting', value)}
                />

                <OptionGrid
                    label="Füllstand"
                    options={fillLevels}
                    selectedValues={formData.fillLevel ? [formData.fillLevel] : []}
                    onToggle={(value) => handleSelect('fillLevel', value)}
                />

                {customTraits.map(trait => (
                    <OptionGrid
                        key={trait.name}
                        label={trait.name}
                        options={trait.options}
                        selectedValues={formData.customTraits?.[trait.name] ? [formData.customTraits[trait.name]] : []}
                        onToggle={(value) => handleSelect('customTrait', value, trait.name)}
                    />
                ))}

                <div className="form-group">
                    <label htmlFor="bulk-date">Datum</label>
                    <input type="date" id="bulk-date" name="date" value={formData.date} onChange={handleDateChange} />
                </div>
                
                <div className="button-group">
                    <button type="button" className="btn btn-secondary" onClick={onBack}>Abbrechen</button>
                    <div className="action-buttons">
                        {isConfirmingClear ? (
                            <div className="confirm-group">
                                <span className="confirm-delete-text">Sind Sie sicher?</span>
                                <button type="button" className="btn btn-danger" onClick={onBulkClear}>Bestätigen</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsConfirmingClear(false)}>Abbrechen</button>
                            </div>
                        ) : (
                            <button type="button" className="btn btn-danger" onClick={() => setIsConfirmingClear(true)}>Ausgewählte leeren</button>
                        )}
                        <button type="submit" className="btn btn-primary">Speichern & auf alle anwenden</button>
                    </div>
                </div>
            </form>
        </div>
    );
};


// --- Management Screen Components ---

const EditableList = ({ title, items, onAdd, onRename, onDelete }) => {
  const [addInputValue, setAddInputValue] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  const getPlaceholderText = () => {
    if (title === 'Sorten') return 'Neue Sorte hinzufügen';
    if (title === 'Sortierungen') return 'Neue Sortierung hinzufügen';
    if (title === 'Füllstände') return 'Neuen Füllstand hinzufügen';
    if (title.startsWith('Optionen für')) {
      const traitName = title.substring(13, title.length - 1);
      return `Neue Option für "${traitName}" hinzufügen`;
    }
    return 'Neues Element hinzufügen';
  };
  
  const getSingularTitle = () => {
    if (title === 'Sorten') return 'Sorte';
    if (title === 'Sortierungen') return 'Sortierung';
    if (title === 'Füllstände') return 'Füllstand';
    return 'Element';
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = addInputValue.trim();
    if (!trimmedValue) return;

    if (items.map(i => i.toLowerCase()).includes(trimmedValue.toLowerCase())) {
        alert(`Ein Element mit dem Namen "${trimmedValue}" existiert bereits in ${title}.`);
        return;
    }
    
    onAdd(trimmedValue);
    setAddInputValue('');
    setEditingItem(null);
    setDeletingItem(null);
  };

  const handleRenameClick = (item) => {
    setEditingItem(item);
    setRenameInputValue(item);
    setDeletingItem(null);
  };

  const handleRenameCancel = () => {
    setEditingItem(null);
    setRenameInputValue('');
  };

  const handleRenameSave = (oldItem) => {
    const trimmedNewItem = renameInputValue.trim();
    if (!trimmedNewItem || trimmedNewItem === oldItem) {
        setEditingItem(null);
        return;
    }

    if (items.map(i => i.toLowerCase()).includes(trimmedNewItem.toLowerCase())) {
        alert(`Ein Element mit dem Namen "${trimmedNewItem}" existiert bereits.`);
        return;
    }
    
    onRename(oldItem, trimmedNewItem);
    setEditingItem(null);
    setRenameInputValue('');
  };

  const handleDeleteClick = (item) => {
    setDeletingItem(item);
    setEditingItem(null);
  };

  const handleConfirmDelete = (item) => {
    onDelete(item);
    setDeletingItem(null);
  };

  return (
    <div className="trait-section">
      <h3>{title}</h3>
      <ul className="editable-list">
        {items.map(item => (
          <li key={item} className="list-item">
            {editingItem === item ? (
              <>
                <input 
                  type="text"
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(item); if (e.key === 'Escape') handleRenameCancel(); }}
                  autoFocus
                  className="rename-input"
                />
                <div className="item-actions">
                  <button className="btn-icon" onClick={() => handleRenameSave(item)}>Speichern</button>
                  <button className="btn-icon btn-icon-secondary" onClick={handleRenameCancel}>Abbrechen</button>
                </div>
              </>
            ) : deletingItem === item ? (
              <>
                <span className="confirm-delete-text">Sind Sie sicher?</span>
                <div className="item-actions">
                  <button className="btn-icon btn-icon-danger" onClick={() => handleConfirmDelete(item)}>Bestätigen</button>
                  <button className="btn-icon btn-icon-secondary" onClick={() => setDeletingItem(null)}>Abbrechen</button>
                </div>
              </>
            ) : (
              <>
                <span>{item}</span>
                <div className="item-actions">
                  <button className="btn-icon" onClick={() => handleRenameClick(item)} aria-label={`${getSingularTitle()} ${item} umbenennen`}>Umbenennen</button>
                  <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteClick(item)} aria-label={`${getSingularTitle()} ${item} löschen`}>Löschen</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddSubmit} className="add-item-form">
          <input 
            type="text" 
            value={addInputValue}
            onChange={e => setAddInputValue(e.target.value)}
            placeholder={getPlaceholderText()}
            aria-label={`Neue ${getSingularTitle()} hinzufügen`}
          />
          <button type="submit" className="btn btn-add" aria-label={`Neue ${getSingularTitle()} hinzufügen`}>+</button>
      </form>
    </div>
  );
};


const ManageTraitsScreen = (props) => {
  const {
    varieties, sortings, fillLevels, customTraits, onBack,
    onAddVariety, onRenameVariety, onDeleteVariety,
    onAddSorting, onRenameSorting, onDeleteSorting,
    onAddFillLevel, onRenameFillLevel, onDeleteFillLevel,
    onAddTrait, onRenameTrait, onDeleteTrait,
    onAddTraitOption, onRenameTraitOption, onDeleteTraitOption,
    onDownloadCsv
  } = props;
  
  const [addTraitNameInput, setAddTraitNameInput] = useState('');
  const [editingTraitName, setEditingTraitName] = useState(null);
  const [deletingTraitName, setDeletingTraitName] = useState(null);
  const [renameTraitInput, setRenameTraitInput] = useState('');

  const handleAddTraitSubmit = (e) => {
    e.preventDefault();
    const trimmedName = addTraitNameInput.trim();
    if (!trimmedName) return;

    if (customTraits.find(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert(`Ein Merkmal mit dem Namen "${trimmedName}" existiert bereits.`);
        return;
    }
    
    onAddTrait(trimmedName);
    setAddTraitNameInput('');
  };
  
  const handleRenameTraitClick = (name) => {
    setEditingTraitName(name);
    setRenameTraitInput(name);
    setDeletingTraitName(null);
  };
  
  const handleRenameTraitCancel = () => {
    setEditingTraitName(null);
    setRenameTraitInput('');
  };

  const handleRenameTraitSave = (oldName) => {
    const trimmedNewName = renameTraitInput.trim();
    if (!trimmedNewName || trimmedNewName === oldName) {
        setEditingTraitName(null);
        return;
    }

    if (customTraits.find(t => t.name.toLowerCase() === trimmedNewName.toLowerCase() && t.name.toLowerCase() !== oldName.toLowerCase())) {
        alert(`Ein Merkmal mit dem Namen "${trimmedNewName}" existiert bereits.`);
        return;
    }
    onRenameTrait(oldName, trimmedNewName);
    setEditingTraitName(null);
    setRenameTraitInput('');
  };

  const handleDeleteTraitClick = (traitName) => {
    setDeletingTraitName(traitName);
    setEditingTraitName(null);
  };
  
  const handleConfirmDeleteTrait = (traitName) => {
    onDeleteTrait(traitName);
    setDeletingTraitName(null);
  }
  
  return (
    <div className="manage-screen">
      <div className="manage-header">
          <h2>Datenoptionen verwalten</h2>
          <div className="header-buttons">
            <button
                className="btn btn-secondary"
                onClick={onDownloadCsv}
              >
              CSV Herunterladen
            </button>
            <button className="btn btn-secondary" onClick={onBack}>Zurück zum Dashboard</button>
          </div>
      </div>
      
      <div className="manage-grid">
        <EditableList title="Sorten" items={varieties} onAdd={onAddVariety} onRename={onRenameVariety} onDelete={onDeleteVariety} />
        <EditableList title="Sortierungen" items={sortings} onAdd={onAddSorting} onRename={onRenameSorting} onDelete={onDeleteSorting} />
        <EditableList title="Füllstände" items={fillLevels} onAdd={onAddFillLevel} onRename={onRenameFillLevel} onDelete={onDeleteFillLevel} />

        <div className="trait-section custom-traits">
            <h3>Benutzerdefinierte Merkmale</h3>
            {customTraits.map(trait => (
                <div key={trait.name} className="custom-trait-manager">
                    {editingTraitName === trait.name ? (
                      <div className="custom-trait-header">
                        <input
                            type="text"
                            value={renameTraitInput}
                            onChange={(e) => setRenameTraitInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameTraitSave(trait.name); if (e.key === 'Escape') handleRenameTraitCancel(); }}
                            autoFocus
                            className="rename-input"
                        />
                        <div className="item-actions">
                          <button className="btn-icon" onClick={() => handleRenameTraitSave(trait.name)}>Speichern</button>
                          <button className="btn-icon btn-icon-secondary" onClick={handleRenameTraitCancel}>Abbrechen</button>
                        </div>
                      </div>
                    ) : deletingTraitName === trait.name ? (
                      <div className="custom-trait-header">
                        <span className="confirm-delete-text">Merkmal löschen?</span>
                        <div className="item-actions">
                          <button className="btn-icon btn-icon-danger" onClick={() => handleConfirmDeleteTrait(trait.name)}>Bestätigen</button>
                          <button className="btn-icon btn-icon-secondary" onClick={() => setDeletingTraitName(null)}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <div className="custom-trait-header">
                        <h4>{trait.name}</h4>
                        <div className="item-actions">
                           <button className="btn-icon" onClick={() => handleRenameTraitClick(trait.name)} aria-label={`Merkmal ${trait.name} umbenennen`}>Umbenennen</button>
                           <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteTraitClick(trait.name)} aria-label={`Merkmal ${trait.name} löschen`}>Löschen</button>
                        </div>
                      </div>
                    )}
                    <EditableList 
                        title={`Optionen für "${trait.name}"`} 
                        items={trait.options} 
                        onAdd={(newItem) => onAddTraitOption(trait.name, newItem)}
                        onRename={(oldItem, newItem) => onRenameTraitOption(trait.name, oldItem, newItem)}
                        onDelete={(item) => onDeleteTraitOption(trait.name, item)}
                    />
                </div>
            ))}
            <form onSubmit={handleAddTraitSubmit} className="add-item-form" style={{ marginTop: '1.5rem' }}>
                <input
                    type="text"
                    value={addTraitNameInput}
                    onChange={(e) => setAddTraitNameInput(e.target.value)}
                    placeholder="Neues Merkmal hinzufügen (z.B. Farbe)"
                    aria-label="Neues benutzerdefiniertes Merkmal hinzufügen"
                />
                <button type="submit" className="btn btn-primary">Merkmal hinzufügen</button>
            </form>
        </div>
      </div>
    </div>
  );
};

// --- Summary Screen ---

const getFillLevelWeight = (fillLevel) => {
    switch (fillLevel) {
        case '100%': return 1.0;
        case '75%': return 0.75;
        case '50%': return 0.5;
        case '25%': return 0.25;
        default: return 1.0; // Default to 1 if undefined or other value
    }
};

const SummaryScreen = ({ boxes, onBack }) => {
  const summaryData = useMemo(() => {
    
    const data = {};
    let emptyBoxes = 0;

    boxes.forEach(box => {
      const hasVarieties = box.varieties && box.varieties.length > 0;
      
      if (!hasVarieties && !box.sorting && !box.date) {
        emptyBoxes++;
        return;
      }
      
      const varieties = hasVarieties ? box.varieties : ['Nicht kategorisiert'];
      const sorting = box.sorting || 'Ohne Sortierung';
      const fillLevel = box.fillLevel || 'Ohne Füllstand';
      const weight = getFillLevelWeight(box.fillLevel);
      
      varieties.forEach(variety => {
          if (!data[variety]) {
            data[variety] = { weightedTotal: 0, sortings: {} };
          }
          data[variety].weightedTotal += weight;
          
          if (!data[variety].sortings[sorting]) {
            data[variety].sortings[sorting] = { weightedTotal: 0, fillLevels: {} };
          }
          data[variety].sortings[sorting].weightedTotal += weight;
          
          const currentCount = data[variety].sortings[sorting].fillLevels[fillLevel] || 0;
          data[variety].sortings[sorting].fillLevels[fillLevel] = currentCount + 1;
      });
    });
    
    const sortedVarieties = Object.keys(data).sort((a,b) => a.localeCompare(b));

    return { summary: data, sortedVarieties, emptyBoxes };
  }, [boxes]);

  return (
    <div className="summary-screen">
       <div className="summary-header">
          <h2>Bestandsübersicht</h2>
          <button className="btn btn-secondary" onClick={onBack}>Zurück zum Dashboard</button>
      </div>
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Leere Kisten</h3>
          <p className="summary-total-count">{summaryData.emptyBoxes}</p>
        </div>
        {summaryData.sortedVarieties.map(varietyName => (
          <div key={varietyName} className="summary-card">
            <h3>{varietyName} <span className="summary-card-total">(Gesamt: {summaryData.summary[varietyName].weightedTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span></h3>
            <ul className="summary-sorting-list">
              {Object.keys(summaryData.summary[varietyName].sortings)
                .sort((a,b) => a.localeCompare(b))
                .map(sortingName => (
                  <li key={sortingName}>
                    <div className="summary-sorting-header">
                       <span className="summary-sorting-name">{sortingName}</span>
                       <span className="summary-sorting-count">{summaryData.summary[varietyName].sortings[sortingName].weightedTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <ul className="summary-fill-level-list">
                       {Object.keys(summaryData.summary[varietyName].sortings[sortingName].fillLevels)
                        .sort((a,b) => a.localeCompare(b))
                        .map(fillLevelName => (
                          <li key={fillLevelName}>
                            <span className="summary-fill-level-name">{fillLevelName}</span>
                            <span className="summary-fill-level-count">{summaryData.summary[varietyName].sortings[sortingName].fillLevels[fillLevelName]}</span>
                          </li>
                       ))}
                    </ul>
                  </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main App Component
const App = () => {
  // --- STATE MANAGEMENT ---
  const [appData, setAppData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    varietyFilter: '',
    sortingFilter: '',
    fillLevelFilter: ''
  });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedBoxIds, setSelectedBoxIds] = useState([]);

  const isInitialMount = useRef(true);

  // --- SUPABASE DATA SYNC ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('app_storage')
          .select('data')
          .eq('id', 1)
          .single();

        // Case 1: Real error occurred during fetch (e.g., table doesn't exist)
        // PGRST116: "exact one row not found" - this is expected on first run, so we ignore it.
        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Datenbankfehler: ${fetchError.message}`);
        }

        // Case 2: Data exists, load it
        if (data?.data) {
          setAppData(data.data);
        } else {
          // Case 3: No data found (first run), initialize with default and save it
          console.log("No data found in Supabase, initializing with default data.");
          const initialData = getInitialData();
          const { error: insertError } = await supabase.from('app_storage').insert({ id: 1, data: initialData });
          
          if (insertError) {
            // This will catch errors if the table doesn't exist on insert
            throw new Error(`Datenbankfehler beim Initialisieren: ${insertError.message}`);
          }
          setAppData(initialData);
        }
      } catch (e) {
        console.error("Fehler bei der Initialisierung:", e);
        setError(
          `Die Anwendung konnte keine Verbindung zur Datenbank herstellen.\n\n` +
          `Fehlermeldung: ${e.message}\n\n` +
          `Mögliche Ursache: Die Datenbanktabelle wurde nicht erstellt oder die CORS-Einstellungen sind falsch.\n` +
          `1. Führen Sie das SQL-Skript im "SQL Editor" Ihres Supabase-Projekts aus.\n` +
          `2. Gehen Sie zu "Authentication" -> "URL Configuration" und fügen Sie Ihre Render/Netlify-URL hinzu.`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('app_storage_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_storage', filter: 'id=eq.1' },
        (payload) => {
          console.log('Real-time change received!', payload);
          // Avoid overwriting local state if we are the ones who just saved
          if (!isInitialMount.current) {
              setAppData(payload.new.data);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Debounced effect to save data to Supabase
  useEffect(() => {
    if (isInitialMount.current || isLoading || !appData) {
        if (!isLoading) {
            isInitialMount.current = false;
        }
        return;
    }

    const handler = setTimeout(() => {
      console.log('Saving data to Supabase...');
      supabase
        .from('app_storage')
        .update({ data: appData, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .then(({ error }) => {
          if (error) {
            console.error('Error saving to Supabase:', error);
          }
        });
    }, 1000); // 1-second debounce

    return () => {
      clearTimeout(handler);
    };
  }, [appData, isLoading]);


  // --- NAVIGATION & MODE HANDLERS ---
  const handleBoxClick = (id) => {
    if (multiSelectMode) {
        handleToggleBoxSelection(id);
    } else {
        setSelectedBoxId(id);
        setView('entry');
    }
  };

  const handleToggleMultiSelectMode = () => {
    setMultiSelectMode(prev => {
        if (prev) { // turning it off
            setSelectedBoxIds([]);
        }
        return !prev;
    });
  };

  const handleBackToDashboard = () => {
    setSelectedBoxId(null);
    setSelectedBoxIds([]);
    setMultiSelectMode(false);
    setView('dashboard');
  };
  
  const handleGoToManage = () => setView('manage');
  const handleGoToSummary = () => setView('summary');
  const handleGoToBulkEdit = () => setView('bulk-edit');
  
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // --- CSV DOWNLOAD HANDLER ---
  const handleDownloadCsv = () => {
    if (!appData) return;
    const { boxes, customTraits } = appData;
    const allTraitNames = (customTraits || []).map(t => t.name).sort();
    const headers = ['Kistennummer','Datum','Sorte(n)','Sortierung','Füllstand', ...allTraitNames].join(',');
    
    const escapeCsvCell = (cellData) => {
      if (cellData === null || cellData === undefined) {
          return '';
      }
      const stringData = String(cellData);
      if (stringData.search(/("|,|\n)/g) >= 0) {
          const escapedString = stringData.replace(/"/g, '""');
          return `"${escapedString}"`;
      }
      return stringData;
    };

    const rows = boxes.map(box => {
        const standardValues = [
            box.id,
            escapeCsvCell(box.date),
            escapeCsvCell(box.varieties?.join('; ')),
            escapeCsvCell(box.sorting),
            escapeCsvCell(box.fillLevel),
        ];
        const traitValues = allTraitNames.map(traitName => escapeCsvCell(box.customTraits?.[traitName]));
        return [...standardValues, ...traitValues].join(',');
    });


    const csvContent = [headers, ...rows].join('\n');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `Kartoffelkisten_Bestand_${today}.csv`;

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };
  
  // --- BOX DATA HANDLERS ---
  const handleSaveBox = (id, data) => {
    if (!appData) return;
    const newBoxes = appData.boxes.map(box =>
        box.id === id ? { ...box, ...data } : box
    );
    setAppData(prev => ({ ...prev, boxes: newBoxes }));
    handleBackToDashboard();
  };
  
  const handleClearBox = (id) => {
    if (!appData) return;
    const newBoxes = appData.boxes.map(box =>
        box.id === id ? { id: box.id } : box
    );
    setAppData(prev => ({ ...prev, boxes: newBoxes }));
    handleBackToDashboard();
  };
  
  // Multi-Select handlers
  const handleToggleBoxSelection = (id) => {
    setSelectedBoxIds(prev =>
      prev.includes(id) ? prev.filter(boxId => boxId !== id) : [...prev, id]
    );
  };

  const handleBulkSave = (dataToApply) => {
    if (Object.keys(dataToApply).length === 0 || !appData) {
        handleBackToDashboard();
        return;
    }
    const newBoxes = appData.boxes.map(box => {
        if (selectedBoxIds.includes(box.id)) {
            const newCustomTraits = { ...box.customTraits, ...dataToApply.customTraits };
            return { ...box, ...dataToApply, customTraits: newCustomTraits };
        }
        return box;
    });
    setAppData(prev => ({...prev, boxes: newBoxes}));
    handleBackToDashboard();
  };
  
  const handleBulkClear = () => {
    if (!appData) return;
    const newBoxes = appData.boxes.map(box => {
      if (selectedBoxIds.includes(box.id)) {
        return { id: box.id };
      }
      return box;
    });
    setAppData(prev => ({ ...prev, boxes: newBoxes }));
    handleBackToDashboard();
  };

  // --- CASCADING DATA MANAGEMENT HANDLERS ---
  
  // Varieties
  const handleAddVariety = (name) => { 
    if (!appData) return;
    const newVarieties = [...(appData.varieties || []), name].sort();
    setAppData(prev => ({ ...prev, varieties: newVarieties }));
  };

  const handleRenameVariety = (oldName, newName) => {
    if (!appData) return;
    const newVarieties = appData.varieties.map(v => v === oldName ? newName : v).sort();
    const newBoxes = appData.boxes.map(box => {
        if (box.varieties?.includes(oldName)) {
            return {
                ...box,
                varieties: box.varieties.map(v => v === oldName ? newName : v).sort()
            };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, varieties: newVarieties, boxes: newBoxes }));
  };

  const handleDeleteVariety = (name) => {
    if (!appData) return;
    const newVarieties = appData.varieties.filter(v => v !== name);
    const newBoxes = appData.boxes.map(box => {
        if (box.varieties?.includes(name)) {
            return {
                ...box,
                varieties: box.varieties.filter(v => v !== name)
            };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, varieties: newVarieties, boxes: newBoxes }));
  };

  // Sortings
  const handleAddSorting = (name) => { 
    if (!appData) return;
    const newSortings = [...(appData.sortings || []), name].sort();
    setAppData(prev => ({ ...prev, sortings: newSortings }));
  };

  const handleRenameSorting = (oldName, newName) => {
    if (!appData) return;
    const newSortings = appData.sortings.map(s => s === oldName ? newName : s).sort();
    const newBoxes = appData.boxes.map(box => {
        if (box.sorting === oldName) {
            return { ...box, sorting: newName };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, sortings: newSortings, boxes: newBoxes }));
  };

  const handleDeleteSorting = (name) => {
    if (!appData) return;
    const newSortings = appData.sortings.filter(s => s !== name);
    const newBoxes = appData.boxes.map(box => {
        if (box.sorting === name) {
            const { sorting, ...restOfBox } = box; // Use 'as any' to bypass strict type checking for property deletion
            return restOfBox;
        }
        return box;
    });
    setAppData(prev => ({ ...prev, sortings: newSortings, boxes: newBoxes }));
  };


  // Fill Levels
  const handleAddFillLevel = (name) => {
      if (!appData) return;
      const newFillLevels = [...(appData.fillLevels || []), name].sort();
      setAppData(prev => ({ ...prev, fillLevels: newFillLevels }));
  };

  const handleRenameFillLevel = (oldName, newName) => {
    if (!appData) return;
    const newFillLevels = appData.fillLevels.map(f => f === oldName ? newName : f).sort();
    const newBoxes = appData.boxes.map(box => {
        if(box.fillLevel === oldName) {
            return { ...box, fillLevel: newName };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, fillLevels: newFillLevels, boxes: newBoxes }));
  };
  
  const handleDeleteFillLevel = (name) => {
    if (!appData) return;
    const newFillLevels = appData.fillLevels.filter(f => f !== name);
    const newBoxes = appData.boxes.map(box => {
        if (box.fillLevel === name) {
            const { fillLevel, ...restOfBox } = box;
            return restOfBox;
        }
        return box;
    });
    setAppData(prev => ({ ...prev, fillLevels: newFillLevels, boxes: newBoxes }));
  };


  // Custom Trait Definitions
  const handleAddTrait = (name) => {
    if (!appData) return;
    const newTrait = { name, options: [] };
    const newTraits = [...(appData.customTraits || []), newTrait].sort((a,b) => a.name.localeCompare(b.name));
    setAppData(prev => ({ ...prev, customTraits: newTraits }));
  };

  const handleRenameTrait = (oldName, newName) => {
    if (!appData) return;
    const newTraits = appData.customTraits.map(t => t.name === oldName ? { ...t, name: newName } : t).sort((a,b) => a.name.localeCompare(b.name));
    const newBoxes = appData.boxes.map(box => {
        if (box.customTraits && box.customTraits[oldName] !== undefined) {
            const { [oldName]: value, ...rest } = box.customTraits;
            return { ...box, customTraits: { ...rest, [newName]: value } };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, customTraits: newTraits, boxes: newBoxes }));
  };

  const handleDeleteTrait = (name) => {
    if (!appData) return;
    const newTraits = appData.customTraits.filter(t => t.name !== name);
    const newBoxes = appData.boxes.map(box => {
        if (box.customTraits && box.customTraits[name] !== undefined) {
            const { [name]: removed, ...rest } = box.customTraits;
            return { ...box, customTraits: rest };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, customTraits: newTraits, boxes: newBoxes }));
  };

  // Custom Trait Options
  const handleAddTraitOption = (traitName, option) => {
    if (!appData) return;
    const newTraits = appData.customTraits.map(trait => {
        if (trait.name === traitName) {
            return { ...trait, options: [...(trait.options || []), option].sort() };
        }
        return trait;
    });
    setAppData(prev => ({ ...prev, customTraits: newTraits }));
  };

  const handleRenameTraitOption = (traitName, oldOption, newOption) => {
    if (!appData) return;
    const newTraits = appData.customTraits.map(trait => {
        if (trait.name === traitName) {
            return { ...trait, options: trait.options.map(opt => opt === oldOption ? newOption : opt).sort() };
        }
        return trait;
    });
    const newBoxes = appData.boxes.map(box => {
        if (box.customTraits?.[traitName] === oldOption) {
            return { ...box, customTraits: { ...box.customTraits, [traitName]: newOption } };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, customTraits: newTraits, boxes: newBoxes }));
  };

  const onDeleteTraitOption = (traitName, option) => {
    if (!appData) return;
    const newTraits = appData.customTraits.map(trait => {
        if (trait.name === traitName) {
            return { ...trait, options: trait.options.filter(opt => opt !== option) };
        }
        return trait;
    });
    const newBoxes = appData.boxes.map(box => {
        if (box.customTraits?.[traitName] === option) {
            const { [traitName]: removed, ...rest } = box.customTraits;
            return { ...box, customTraits: rest };
        }
        return box;
    });
    setAppData(prev => ({ ...prev, customTraits: newTraits, boxes: newBoxes }));
  };

  // --- DERIVED STATE / MEMOS ---
  const { boxes, varieties, sortings, fillLevels, customTraits } = appData || getInitialData();
  const selectedBox = useMemo(() => boxes.find(box => box.id === selectedBoxId), [boxes, selectedBoxId]);

  const filteredBoxes = useMemo(() => {
    return boxes.filter(box => {
      const matchesSearch = filters.searchTerm ? box.id.toString().includes(filters.searchTerm) : true;
      const matchesVariety = filters.varietyFilter ? box.varieties?.includes(filters.varietyFilter) : true;
      const matchesSorting = filters.sortingFilter ? box.sorting === filters.sortingFilter : true;
      const matchesFillLevel = filters.fillLevelFilter ? box.fillLevel === filters.fillLevelFilter : true;
      return matchesSearch && matchesVariety && matchesSorting && matchesFillLevel;
    });
  }, [boxes, filters]);
  
  // --- LOADING STATE RENDER ---
  if (isLoading) {
    return <LoadingScreen message="Verbinde mit Datenbank..." />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  // --- RENDER LOGIC ---
  const renderContent = () => {
    switch (view) {
      case 'entry':
        if (!selectedBox) return null;
        return (
          <DataEntryScreen
            box={selectedBox}
            onSave={handleSaveBox}
            onClear={handleClearBox}
            onBack={handleBackToDashboard}
            varieties={varieties}
            sortings={sortings}
            fillLevels={fillLevels}
            customTraits={customTraits}
          />
        );
      case 'bulk-edit':
        return (
          <BulkEditScreen
            selectedBoxIds={selectedBoxIds}
            onBulkSave={handleBulkSave}
            onBulkClear={handleBulkClear}
            onBack={handleBackToDashboard}
            varieties={varieties}
            sortings={sortings}
            fillLevels={fillLevels}
            customTraits={customTraits}
          />
        );
      case 'manage':
        return (
          <ManageTraitsScreen
            varieties={varieties}
            sortings={sortings}
            fillLevels={fillLevels}
            customTraits={customTraits}
            onBack={handleBackToDashboard}
            onAddVariety={handleAddVariety}
            onRenameVariety={handleRenameVariety}
            onDeleteVariety={handleDeleteVariety}
            onAddSorting={handleAddSorting}
            onRenameSorting={handleRenameSorting}
            onDeleteSorting={handleDeleteSorting}
            onAddFillLevel={handleAddFillLevel}
            onRenameFillLevel={handleRenameFillLevel}
            onDeleteFillLevel={handleDeleteFillLevel}
            onAddTrait={handleAddTrait}
            onRenameTrait={handleRenameTrait}
            onDeleteTrait={handleDeleteTrait}
            onAddTraitOption={handleAddTraitOption}
            onRenameTraitOption={handleRenameTraitOption}
            onDeleteTraitOption={onDeleteTraitOption}
            onDownloadCsv={handleDownloadCsv}
          />
        );
      case 'summary':
        return (
          <SummaryScreen
            boxes={boxes}
            onBack={handleBackToDashboard}
          />
        );
      case 'dashboard':
      default:
        return (
          <Dashboard
            boxes={filteredBoxes}
            onBoxClick={handleBoxClick}
            filters={{...filters, allVarieties: varieties, allSortings: sortings, allFillLevels: fillLevels}}
            onFilterChange={handleFilterChange}
            onGoToManage={handleGoToManage}
            onGoToSummary={handleGoToSummary}
            multiSelectMode={multiSelectMode}
            onToggleMultiSelectMode={handleToggleMultiSelectMode}
            selectedBoxIds={selectedBoxIds}
            onGoToBulkEdit={handleGoToBulkEdit}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {renderContent()}
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
