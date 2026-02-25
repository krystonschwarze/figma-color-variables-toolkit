// Variables to Canvas Plugin
// Erstellt eine visuelle Darstellung von Variable Collections auf dem Canvas

/// <reference types="@figma/plugin-typings" />

interface CollectionData {
  id: string;
  name: string;
}

interface VariableWithCollection {
  variable: Variable;
  collection: CollectionData;
}

interface GroupedVariables {
  [groupName: string]: {
    [subgroupName: string]: VariableWithCollection[];
  };
}

// UI anzeigen
figma.showUI(__html__, { width: 300, height: 200 });

// Nachrichten von der UI verarbeiten
figma.ui.onmessage = (msg: { type: string; collectionId?: string }) => {
  if (msg.type === 'load-collections') {
    loadVariableCollections();
  } else if (msg.type === 'generate-canvas' && msg.collectionId) {
    generateCanvasForCollection(msg.collectionId);
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// Variable Collections laden
async function loadVariableCollections(): Promise<void> {
  try {
    console.log('Lade Variable Collections...');
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    console.log('Gefundene Collections:', collections.length);
    
    const collectionData: CollectionData[] = collections.map(collection => {
      console.log('Collection:', collection.name, 'ID:', collection.id);
      return {
        id: collection.id,
        name: collection.name
      };
    });

    console.log('Sende Collections an UI:', collectionData);
    figma.ui.postMessage({
      type: 'collections-loaded',
      collections: collectionData
    });
  } catch (error) {
    console.error('Fehler beim Laden der Collections:', error);
    figma.ui.postMessage({
      type: 'collections-loaded',
      collections: [],
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
}

// Canvas für ausgewählte Collection generieren
async function generateCanvasForCollection(collectionId: string): Promise<void> {
  try {
    console.log('=== DEBUGGING START ===');
    console.log('Generiere Canvas für Collection ID:', collectionId);
    
    // Debug-Test-Frame entfernt
    
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error('Collection nicht gefunden');
    }
    console.log('Collection gefunden:', collection.name);
    console.log('Collection ID:', collection.id);
    console.log('Collection Modes:', collection.modes.length);

    // Alle Variablen der Collection laden
    const allVariables = await figma.variables.getLocalVariablesAsync();
    console.log('Alle Variablen im Dokument:', allVariables.length);
    
    // Debug: Zeige alle Variablen
    allVariables.forEach((variable, index) => {
      console.log(`Variable ${index}:`, {
        name: variable.name,
        id: variable.id,
        collectionId: variable.variableCollectionId,
        type: variable.resolvedType,
        key: variable.key
      });
    });
    
        const collectionVariables = allVariables.filter(variable => 
          variable.variableCollectionId === collectionId
        );
        console.log('Variablen in Collection:', collectionVariables.length);
        console.log('Collection Variablen Details:', collectionVariables.map(v => ({ 
          name: v.name, 
          key: v.key, 
          type: v.resolvedType,
          id: v.id
        })));
        
        // Debug: Zeige alle Werte der Variablen
        collectionVariables.forEach(variable => {
          console.log(`=== Variable: ${variable.name} ===`);
          console.log('Typ:', variable.resolvedType);
          console.log('Alle Werte:', variable.valuesByMode);
          collection.modes.forEach(mode => {
            const value = variable.valuesByMode[mode.modeId];
            console.log(`Mode "${mode.name}" (${mode.modeId}):`, value);
          });
        });

    // Haupt-Frame für die Collection erstellen
    const mainFrame = await createMainFrame(collection.name);
    console.log('Haupt-Frame erstellt:', mainFrame.name);

    if (collectionVariables.length === 0) {
      console.log('Keine Variablen gefunden - erstelle Hinweis-Text');
      // Erstelle einen einfachen Frame mit Text-Information als Name
      const noVariablesFrame = figma.createFrame();
      noVariablesFrame.name = `Keine Variablen in "${collection.name}" gefunden. Collection ID: ${collectionId}`;
      noVariablesFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
      noVariablesFrame.cornerRadius = 4;
      // noVariablesFrame.resize(360, 150); // Entfernt - Frame soll sich automatisch anpassen
      noVariablesFrame.x = 20;
      noVariablesFrame.y = 20;
      mainFrame.appendChild(noVariablesFrame);
    } else {
      console.log('Erstelle hierarchische Struktur für', collectionVariables.length, 'Variablen');
      // Erstelle hierarchische Struktur
      await createHierarchicalVariableStructure(collectionVariables, collection, mainFrame);
    }

    // Haupt-Frame auf Hug setzen (keine feste Größe)
    // mainFrame.resize(400, totalHeight); // Entfernt - Frame soll sich automatisch anpassen

    // Alle erstellten Nodes auswählen und in Viewport zentrieren
    const allNodes = [mainFrame];
    figma.currentPage.selection = allNodes;
    figma.viewport.scrollAndZoomIntoView(allNodes);

    console.log('=== DEBUGGING END ===');
    figma.ui.postMessage({ type: 'generation-complete' });

  } catch (error) {
    console.error('=== FEHLER ===');
    console.error('Fehler beim Generieren des Canvas:', error);
    console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
    figma.ui.postMessage({ type: 'generation-complete' });
  }
}

// Variablen nach Gruppen organisieren
function organizeVariablesByGroups(
  variables: Variable[], 
  collection: VariableCollection
): GroupedVariables {
  const grouped: GroupedVariables = {};

  console.log('Organisiere', variables.length, 'Variablen in Gruppen');

  variables.forEach(variable => {
    console.log('=== DEBUG Variable ===');
    console.log('Variable Name:', variable.name);
    console.log('Variable Key:', variable.key);
    console.log('Variable ID:', variable.id);
    
    // Gruppierung basierend auf Variable-Key (falls vorhanden)
    let group = 'Ungruppiert';
    let subgroup = 'Standard';
    
    // Verwende den Variable-Key für die Gruppierung
    if (variable.key && variable.key.includes('/')) {
      const parts = variable.key.split('/');
      console.log('Key Parts:', parts);
      if (parts.length >= 2) {
        group = parts[0] || 'Ungruppiert';        // z.B. "attention"
        subgroup = parts[1] || 'Standard';        // z.B. "dark"
        console.log('Parsed - Gruppe:', group, 'Untergruppe:', subgroup);
      } else {
        group = parts[0] || 'Ungruppiert';
        subgroup = 'Standard';
        console.log('Fallback - Gruppe:', group, 'Untergruppe:', subgroup);
      }
    } else if (variable.key) {
      // Wenn kein Slash vorhanden ist, verwende den ganzen Key als Gruppe
      group = variable.key;
      subgroup = 'Standard';
      console.log('No Slash - Gruppe:', group, 'Untergruppe:', subgroup);
    } else {
      // Fallback: Gruppiere nach Variable-Name
      if (variable.name.toLowerCase().includes('primary')) {
        group = 'Primary';
        subgroup = 'Colors';
      } else if (variable.name.toLowerCase().includes('secondary')) {
        group = 'Secondary';
        subgroup = 'Colors';
      } else if (variable.name.toLowerCase().includes('background')) {
        group = 'Background';
        subgroup = 'Colors';
      } else if (variable.name.toLowerCase().includes('text')) {
        group = 'Text';
        subgroup = 'Colors';
      } else {
        group = 'Other';
        subgroup = 'Colors';
      }
      console.log('Name Fallback - Gruppe:', group, 'Untergruppe:', subgroup);
    }

    console.log('FINAL - Gruppe:', group, 'Untergruppe:', subgroup, 'Variable:', variable.name);

    if (!grouped[group]) {
      grouped[group] = {};
      console.log('Neue Gruppe erstellt:', group);
    }
    if (!grouped[group][subgroup]) {
      grouped[group][subgroup] = [];
      console.log('Neue Untergruppe erstellt:', group, '->', subgroup);
    }

    grouped[group][subgroup].push({
      variable,
      collection: {
        id: collection.id,
        name: collection.name
      }
    });
    console.log('Variable hinzugefügt zu:', group, '->', subgroup);
  });

  console.log('Finale Gruppierung:', grouped);
  return grouped;
}

// Haupt-Frame erstellen
async function createMainFrame(collectionName: string): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = `Variables - ${collectionName}`;
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  frame.cornerRadius = 40;
  frame.layoutMode = 'HORIZONTAL'; // HORIZONTAL für Modes nebeneinander
  frame.itemSpacing = 20;
  frame.paddingTop = 20;
  frame.paddingBottom = 20;
  frame.paddingLeft = 20;
  frame.paddingRight = 20;
  frame.layoutWrap = 'NO_WRAP'; // Wrap für mehrere Modes
  frame.layoutSizingHorizontal = 'HUG';
  frame.layoutSizingVertical = 'HUG';
  
  figma.currentPage.appendChild(frame);
  return frame;
}

// Gruppen-Frame erstellen
function createGroupFrame(groupName: string, parent: FrameNode, x: number, y: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = groupName;
  frame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  frame.cornerRadius = 6;
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.x = x;
  frame.y = y;
  
  // Gruppen-Titel hinzufügen
  const title = figma.createText();
  title.characters = groupName;
  title.fontSize = 18;
  title.fontName = { family: "Inter", style: "Medium" };
  title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  frame.appendChild(title);
  
  parent.appendChild(frame);
  return frame;
}

// Untergruppen-Frame erstellen
function createSubgroupFrame(subgroupName: string, parent: FrameNode, x: number, y: number): FrameNode {
  const frame = figma.createFrame();
  frame.name = subgroupName;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.cornerRadius = 4;
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 16;
  frame.paddingTop = 12;
  frame.paddingBottom = 12;
  frame.paddingLeft = 12;
  frame.paddingRight = 12;
  frame.x = x;
  frame.y = y;
  frame.layoutWrap = 'NO_WRAP';
  frame.layoutSizingHorizontal = 'FILL';
  
  // Untergruppen-Titel hinzufügen
  const title = figma.createText();
  title.characters = subgroupName;
  title.fontSize = 14;
  title.fontName = { family: "Inter", style: "Medium" };
  title.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }];
  frame.appendChild(title);
  
  parent.appendChild(frame);
  return frame;
}

// Variable-Rechtecke erstellen
async function createVariableRectangles(
  variables: VariableWithCollection[], 
  collection: CollectionData,
  parent: FrameNode
): Promise<RectangleNode[]> {
  const rectangles: RectangleNode[] = [];
  console.log('Erstelle Rechtecke für', variables.length, 'Variablen');

  for (const variableData of variables) {
    const variable = variableData.variable;
    console.log('Verarbeite Variable:', variable.name, 'Typ:', variable.resolvedType);
    
    // Für jeden Mode der Variable ein Rechteck erstellen
    const collectionObj = await figma.variables.getVariableCollectionByIdAsync(collection.id);
    const modes = collectionObj ? collectionObj.modes : [];
    console.log('Modes für Variable', variable.name, ':', modes.length);
    
    for (const mode of modes) {
      console.log('Erstelle Rechteck für Variable:', variable.name, 'Mode:', mode.name);
      const rect = figma.createRectangle();
      rect.resize(100, 100);
      rect.cornerRadius = 4;
      
      // Variable an das Rechteck binden
      try {
        if (variable.resolvedType === 'COLOR') {
          // Verwende die korrekte Variable-Bindung über fillStyleId
          rect.fillStyleId = variable.id;
        }
      } catch (error) {
        console.warn(`Fehler beim Binden der Variable ${variable.name}:`, error);
        // Fallback: Direkte Farbe setzen
        try {
          const colorValue = variable.valuesByMode[mode.modeId];
          if (colorValue && typeof colorValue === 'object' && 'r' in colorValue) {
            rect.fills = [{
              type: 'SOLID',
              color: {
                r: (colorValue as RGB).r,
                g: (colorValue as RGB).g,
                b: (colorValue as RGB).b
              }
            }];
          } else {
            rect.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
          }
        } catch (fallbackError) {
          console.warn(`Fallback-Fehler für Variable ${variable.name}:`, fallbackError);
          rect.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
        }
      }
      
      // Frame mit korrekter Benennung erstellen
      const container = figma.createFrame();
      // Benennung: Gruppe/Untergruppe/VariableName - ModeName
      const groupParts = variable.key ? variable.key.split('/') : ['Ungruppiert'];
      const groupName = groupParts[0] || 'Ungruppiert';
      const subgroupName = groupParts[1] || 'Standard';
      container.name = `${groupName}/${subgroupName}/${variable.name} - ${mode.name}`;
      container.resize(100, 100);
      container.fills = [];
      container.appendChild(rect);
      
      parent.appendChild(container);
      rectangles.push(rect);
    }
  }

  return rectangles;
}

// Einfache Variable-Frames erstellen (ohne komplexe Gruppierung)
async function createSimpleVariableRectangles(
  variables: Variable[], 
  collection: VariableCollection,
  parent: FrameNode
): Promise<FrameNode[]> {
  const frames: FrameNode[] = [];
  console.log('Erstelle einfache Frames für', variables.length, 'Variablen');

  for (const variable of variables) {
    console.log('Verarbeite Variable:', variable.name, 'Typ:', variable.resolvedType);
    
    // Für jeden Mode der Variable ein Frame erstellen
    const modes = collection.modes;
    console.log('Modes für Variable', variable.name, ':', modes.length);
    
    for (const mode of modes) {
      console.log('Erstelle Frame für Variable:', variable.name, 'Mode:', mode.name);
      
      // Frame direkt mit der Variablenfarbe erstellen
      const variableFrame = figma.createFrame();
      variableFrame.name = `${variable.name} - ${mode.name}`;
      variableFrame.resize(100, 100);
      variableFrame.cornerRadius = 4;
      
      // NEUER ANSATZ: Direkte Variable-Bindung ohne Umwege
      console.log(`=== NEUER ANSATZ für Variable: ${variable.name} ===`);
      console.log('Variable ID:', variable.id);
      console.log('Variable Typ:', variable.resolvedType);
      console.log('Variable Key:', variable.key);
      console.log('Variable Collection ID:', variable.variableCollectionId);
      console.log('Alle Variable-Werte:', variable.valuesByMode);
      
      try {
        if (variable.resolvedType === 'COLOR') {
          // Versuche die Variable direkt zu binden - das ist der einfachste Weg
          console.log(`Versuche direkte Variable-Bindung für ${variable.name}...`);
          
          // Setze die Variable direkt als Fill (korrekte API)
          variableFrame.fills = [{
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 }, // Temporärer Wert
            boundVariables: {
              color: {
                type: 'VARIABLE_ALIAS',
                id: variable.id
              }
            }
          }];
          
          console.log(`✅ Variable ${variable.name} direkt als Fill gesetzt`);
          
          // Debug: Prüfe was tatsächlich gesetzt wurde
          console.log('Frame fills nach Variable-Setzung:', variableFrame.fills);
          
        } else {
          console.log(`Variable ${variable.name} ist nicht vom Typ COLOR`);
          variableFrame.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
        }
      } catch (error) {
        console.error(`Fehler bei direkter Variable-Bindung für ${variable.name}:`, error);
        
        // Fallback: Versuche es mit setFillStyleIdAsync
        try {
          console.log(`Fallback: Versuche setFillStyleIdAsync für ${variable.name}...`);
          await variableFrame.setFillStyleIdAsync(variable.id);
          console.log(`✅ setFillStyleIdAsync erfolgreich für ${variable.name}`);
        } catch (fallbackError) {
          console.error(`Auch setFillStyleIdAsync fehlgeschlagen für ${variable.name}:`, fallbackError);
          
          // Letzter Fallback: Direkte Farbe aus Variable-Werten
          try {
            const colorValue = variable.valuesByMode[mode.modeId];
            console.log(`Letzter Fallback: Direkte Farbe für ${variable.name}:`, colorValue);
            
            if (colorValue && typeof colorValue === 'object' && 'r' in colorValue) {
              const rgbValue = colorValue as RGB;
              const alpha = 'a' in colorValue ? (colorValue as any).a : 1;
              
              variableFrame.fills = [{
                type: 'SOLID',
                color: {
                  r: rgbValue.r,
                  g: rgbValue.g,
                  b: rgbValue.b
                },
                opacity: alpha
              }];
              console.log(`✅ Direkte Farbe gesetzt für ${variable.name}:`, { r: rgbValue.r, g: rgbValue.g, b: rgbValue.b, a: alpha });
            } else {
              variableFrame.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
              console.log(`⚠️ Kein gültiger Farbwert, verwende Grau für ${variable.name}`);
            }
          } catch (finalError) {
            console.error(`Alle Methoden fehlgeschlagen für ${variable.name}:`, finalError);
            variableFrame.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
          }
        }
      }
      
      parent.appendChild(variableFrame);
      frames.push(variableFrame);
    }
  }

  return frames;
}

// Hierarchische Variable-Struktur erstellen - KOMPLETT FLEXIBEL
async function createHierarchicalVariableStructure(
  variables: Variable[], 
  collection: VariableCollection,
  parent: FrameNode
): Promise<void> {
  console.log('Erstelle FLEXIBLE hierarchische Struktur für', variables.length, 'Variablen');
  
  // Erstelle eine rekursive Datenstruktur für alle Gruppierungen
  const groupTree: { [key: string]: any } = {};
  
  variables.forEach(variable => {
    console.log('Verarbeite Variable:', variable.name);
    
    if (variable.name && variable.name.includes('/')) {
      const parts = variable.name.split('/');
      console.log('Variable Parts:', parts, 'Anzahl Ebenen:', parts.length);
      
      // Rekursiv durch alle Ebenen gehen
      let currentLevel = groupTree;
      
      // Alle Teile außer dem letzten sind Gruppierungen
      for (let i = 0; i < parts.length - 1; i++) {
        const groupName = parts[i];
        
        if (!currentLevel[groupName]) {
          currentLevel[groupName] = {
            type: 'group',
            children: {},
            variables: []
          };
        }
        
        currentLevel = currentLevel[groupName].children;
      }
      
      // Der letzte Teil ist die Variable
      const variableName = parts[parts.length - 1];
      if (!currentLevel[variableName]) {
        currentLevel[variableName] = {
          type: 'variable',
          variable: variable
        };
      }
      
      console.log(`Variable ${variable.name} zu Baum hinzugefügt`);
    } else {
      // Variable ohne Slashes - direkt in Root
      const variableName = variable.name || 'Other';
      if (!groupTree[variableName]) {
        groupTree[variableName] = {
          type: 'variable',
          variable: variable
        };
      }
      console.log(`Variable ${variable.name} ohne Slash - direkt in Root hinzugefügt`);
    }
  });
  
  console.log('Erstellter Gruppenbaum:', groupTree);
  
  // Für jeden Mode einen Frame erstellen
  for (const mode of collection.modes) {
    console.log(`Erstelle Mode-Frame: ${mode.name}`);
    
    const modeFrame = figma.createFrame();
    modeFrame.name = mode.name;
    modeFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    modeFrame.cornerRadius = 8;
    modeFrame.layoutMode = 'VERTICAL';
    modeFrame.itemSpacing = 16;
    modeFrame.paddingTop = 16;
    modeFrame.paddingBottom = 16;
    modeFrame.paddingLeft = 16;
    modeFrame.paddingRight = 16;
    modeFrame.layoutWrap = 'NO_WRAP';
    modeFrame.layoutSizingHorizontal = 'HUG';
    modeFrame.layoutSizingVertical = 'HUG';
    
    // Rekursiv durch den Gruppenbaum gehen und Frames erstellen
    await createFramesFromTree(groupTree, modeFrame, mode.name);
    
    parent.appendChild(modeFrame);
  }
}

// Natürliche Sortierung für Zahlen (01, 02, 03, ..., 10, 11, 12)
function naturalSort(a: string, b: string): number {
  // Teile die Strings in Text- und Zahlenteile auf
  const regex = /(\d+|\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    // Prüfe ob beide Teile Zahlen sind
    const aIsNum = /^\d+$/.test(aPart);
    const bIsNum = /^\d+$/.test(bPart);
    
    if (aIsNum && bIsNum) {
      // Beide sind Zahlen - numerisch vergleichen
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Mindestens einer ist Text - alphabetisch vergleichen
      const comparison = aPart.localeCompare(bPart);
      if (comparison !== 0) {
        return comparison;
      }
    }
  }
  
  return 0;
}

// Rekursive Funktion zum Erstellen von Frames aus dem Gruppenbaum
async function createFramesFromTree(
  tree: { [key: string]: any }, 
  parentFrame: FrameNode, 
  modeName: string
): Promise<void> {
  
  // Sortiere die Einträge alphabetisch mit natürlicher Sortierung für Zahlen
  const sortedEntries = Object.entries(tree).sort(([keyA], [keyB]) => {
    return naturalSort(keyA, keyB);
  });
  
  for (const [key, value] of sortedEntries) {
    if (value.type === 'group') {
      console.log(`Erstelle Gruppen-Frame: ${key}`);
      
      // Prüfe ob diese Gruppe nur Variablen enthält (letzte Ebene)
      const hasOnlyVariables = Object.values(value.children).every((child: any) => child.type === 'variable');
      
      const groupFrame = figma.createFrame();
      groupFrame.name = key;
      groupFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
      groupFrame.cornerRadius = 6;
      
      if (hasOnlyVariables) {
        // Letzte Ebene: Variablen horizontal nebeneinander
        groupFrame.layoutMode = 'HORIZONTAL';
        console.log(`Gruppe ${key} enthält nur Variablen - HORIZONTAL`);
      } else {
        // Alle anderen Ebenen: Gruppen vertikal untereinander
        groupFrame.layoutMode = 'VERTICAL';
        console.log(`Gruppe ${key} enthält Untergruppen - VERTIKAL`);
      }
      
      groupFrame.itemSpacing = 16;
      groupFrame.paddingTop = 16;
      groupFrame.paddingBottom = 16;
      groupFrame.paddingLeft = 16;
      groupFrame.paddingRight = 16;
      groupFrame.layoutWrap = 'NO_WRAP';
      groupFrame.layoutSizingHorizontal = 'HUG';
      groupFrame.layoutSizingVertical = 'HUG';
      
      // Rekursiv Untergruppen erstellen
      await createFramesFromTree(value.children, groupFrame, modeName);
      
      parentFrame.appendChild(groupFrame);
      
    } else if (value.type === 'variable') {
      console.log(`Erstelle Variable-Frame: ${key} für Mode: ${modeName}`);
      
      const variableFrame = figma.createFrame();
      variableFrame.name = value.variable.name;
      variableFrame.resize(64, 64);  // 64x64 Pixel (feste Größe für Variable-Frames)
      variableFrame.cornerRadius = 4;
      
      try {
        if (value.variable.resolvedType === 'COLOR') {
          variableFrame.fills = [{
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 },
            boundVariables: {
              color: {
                type: 'VARIABLE_ALIAS',
                id: value.variable.id
              }
            }
          }];
          console.log(`✅ Variable ${key} für Mode ${modeName} gebunden`);
        } else {
          variableFrame.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
        }
      } catch (error) {
        console.error(`Fehler bei Variable-Bindung für ${key}:`, error);
        variableFrame.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
      }
      
      parentFrame.appendChild(variableFrame);
    }
  }
}
