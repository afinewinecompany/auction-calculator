import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PlayerValue, LeagueSettings } from '@shared/schema';

export type PDFLayout = 'full' | 'positional' | 'tiers' | 'targets';

interface ExportOptions {
  players: PlayerValue[];
  leagueSettings?: LeagueSettings;
  layout: PDFLayout;
  targetedPlayerIds?: string[];
  title?: string;
}

export function exportToPDF({
  players,
  leagueSettings,
  layout,
  targetedPlayerIds = [],
  title = 'Auction Cheat Sheet'
}: ExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  
  if (leagueSettings) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${leagueSettings.teamCount} Teams | $${leagueSettings.auctionBudget} Budget`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );
  }

  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });
  doc.setTextColor(0);

  let startY = 42;

  switch (layout) {
    case 'full':
      generateFullLayout(doc, players, startY);
      break;
    case 'positional':
      generatePositionalLayout(doc, players, startY);
      break;
    case 'tiers':
      generateTierLayout(doc, players, startY);
      break;
    case 'targets':
      generateTargetsLayout(doc, players, targetedPlayerIds, startY);
      break;
  }

  doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

function generateFullLayout(doc: jsPDF, players: PlayerValue[], startY: number) {
  const sortedPlayers = [...players].sort((a, b) => a.rank - b.rank);
  
  autoTable(doc, {
    startY,
    head: [['Rank', 'Player', 'Team', 'Pos', 'Value', 'Tier']],
    body: sortedPlayers.slice(0, 200).map(player => [
      `#${player.rank}`,
      player.name,
      player.team || '-',
      player.positions.slice(0, 2).join('/'),
      `$${player.adjustedValue || player.originalValue}`,
      player.tier ? `T${player.tier}` : '-'
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [245, 230, 211],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 45 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 15, halign: 'center' },
    },
  });
}

function generatePositionalLayout(doc: jsPDF, players: PlayerValue[], startY: number) {
  const hitterPositions = ['C', '1B', '2B', '3B', 'SS', 'OF'];
  const pitcherPositions = ['SP', 'RP'];
  
  let currentY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HITTERS', 14, currentY);
  currentY += 6;

  for (const pos of hitterPositions) {
    const posPlayers = players
      .filter(p => p.positions.includes(pos))
      .sort((a, b) => (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue))
      .slice(0, 15);
    
    if (posPlayers.length === 0) continue;
    
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(pos, 14, currentY);
    currentY += 2;

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Player', 'Team', 'Value']],
      body: posPlayers.map(player => [
        `#${player.rank}`,
        player.name,
        player.team || '-',
        `$${player.adjustedValue || player.originalValue}`,
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [139, 69, 19],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PITCHERS', 14, currentY);
  currentY += 6;

  for (const pos of pitcherPositions) {
    const posPlayers = players
      .filter(p => p.positions.includes(pos))
      .sort((a, b) => (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue))
      .slice(0, 15);
    
    if (posPlayers.length === 0) continue;
    
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(pos, 14, currentY);
    currentY += 2;

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Player', 'Team', 'Value']],
      body: posPlayers.map(player => [
        `#${player.rank}`,
        player.name,
        player.team || '-',
        `$${player.adjustedValue || player.originalValue}`,
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: {
        fillColor: [45, 80, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }
}

function generateTierLayout(doc: jsPDF, players: PlayerValue[], startY: number) {
  const tiers: { [key: number]: PlayerValue[] } = {};
  
  players.forEach(player => {
    const tier = player.tier || Math.ceil(player.rank / 20);
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(player);
  });

  let currentY = startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const tierColors: { [key: number]: [number, number, number] } = {
    1: [255, 215, 0],
    2: [192, 192, 192],
    3: [205, 127, 50],
    4: [70, 130, 180],
    5: [128, 128, 128],
  };

  Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 5)
    .forEach(tierNum => {
      const tierPlayers = tiers[tierNum]
        .sort((a, b) => (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue));
      
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tier ${tierNum}`, 14, currentY);
      currentY += 2;

      const headerColor = tierColors[tierNum] || [100, 100, 100];

      autoTable(doc, {
        startY: currentY,
        head: [['Rank', 'Player', 'Pos', 'Value']],
        body: tierPlayers.slice(0, 25).map(player => [
          `#${player.rank}`,
          player.name,
          player.positions.slice(0, 2).join('/'),
          `$${player.adjustedValue || player.originalValue}`,
        ]),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: {
          fillColor: headerColor,
          textColor: tierNum <= 3 ? [0, 0, 0] : [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
}

function generateTargetsLayout(doc: jsPDF, players: PlayerValue[], targetedPlayerIds: string[], startY: number) {
  const targetedPlayers = players
    .filter(p => targetedPlayerIds.includes(p.id))
    .sort((a, b) => (b.adjustedValue || b.originalValue) - (a.adjustedValue || a.originalValue));
  
  if (targetedPlayers.length === 0) {
    doc.setFontSize(12);
    doc.text('No players have been targeted yet.', 14, startY);
    doc.text('Use the star icon to mark players as targets.', 14, startY + 10);
    return;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`MY TARGETS (${targetedPlayers.length} players)`, 14, startY);
  
  autoTable(doc, {
    startY: startY + 6,
    head: [['Priority', 'Player', 'Team', 'Pos', 'Value', 'Max Bid']],
    body: targetedPlayers.map((player, idx) => [
      `${idx + 1}`,
      player.name,
      player.team || '-',
      player.positions.slice(0, 2).join('/'),
      `$${player.adjustedValue || player.originalValue}`,
      `$${Math.round((player.adjustedValue || player.originalValue) * 1.15)}`,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [218, 165, 32],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [255, 250, 230],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
  });
}
