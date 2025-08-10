import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface PerformanceDataPoint {
  week: string;
  value: number;
  date: string;
}

interface PerformanceGraphProps {
  data: PerformanceDataPoint[];
  metric: 'charge' | 'repetitions';
}

const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ data, metric }) => {
  const [startIndex, setStartIndex] = useState<number>(0);
  const [endIndex, setEndIndex] = useState<number>(9);

  // Données triées par date
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Initialiser les sélecteurs avec les données disponibles
  useEffect(() => {
    if (sortedData.length > 0) {
      const maxEndIndex = Math.min(sortedData.length - 1, 9);
      setStartIndex(0);
      setEndIndex(maxEndIndex);
    }
  }, [sortedData]);

  // Données filtrées selon la sélection (max 10 semaines)
  const filteredData = useMemo(() => {
    const start = Math.max(0, startIndex);
    const end = Math.min(sortedData.length - 1, startIndex + 9);
    return sortedData.slice(start, end + 1);
  }, [sortedData, startIndex]);

  // Options pour les sélecteurs
  const startOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < sortedData.length; i++) {
      options.push({ label: `${sortedData[i].week}`, value: i });
    }
    return options;
  }, [sortedData]);

  const endOptions = useMemo(() => {
    const options = [];
    const maxEnd = Math.min(sortedData.length - 1, startIndex + 9);
    for (let i = startIndex; i <= maxEnd; i++) {
      options.push({ label: `${sortedData[i].week}`, value: i });
    }
    return options;
  }, [sortedData, startIndex]);

  const handleStartIndexChange = useCallback((index: number) => {
    setStartIndex(index);
    // Ajuster automatiquement la fin si nécessaire (max 10 semaines)
    const maxEnd = Math.min(sortedData.length - 1, index + 9);
    setEndIndex(maxEnd);
  }, [sortedData.length]);

  const handleEndIndexChange = useCallback((index: number) => {
    // S'assurer qu'on ne dépasse pas 10 semaines
    const maxStart = Math.max(0, index - 9);
    if (startIndex < maxStart) {
      setStartIndex(maxStart);
    }
    setEndIndex(index);
  }, [startIndex]);

  if (sortedData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      </View>
    );
  }

  // Dimensions du graphique
  const graphWidth = screenWidth - 80;
  const graphHeight = 250;
  const graphPadding = 40;
  const pointRadius = 6;
  const effectiveGraphWidth = graphWidth - (graphPadding * 2) - (pointRadius * 2);
  const availableHeight = graphHeight - 80;

  // Calcul des valeurs min/max avec une marge
  const values = filteredData.map(item => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const margin = valueRange * 0.1; // 10% de marge
  const adjustedMin = minValue - margin;
  const adjustedMax = maxValue + margin;
  const adjustedRange = adjustedMax - adjustedMin;

  // Fonction pour calculer la position X d'un point
  const getX = useCallback((index: number) => {
    if (filteredData.length === 1) {
      return graphPadding + pointRadius + effectiveGraphWidth / 2;
    }
    return graphPadding + pointRadius + (index * effectiveGraphWidth) / (filteredData.length - 1);
  }, [filteredData.length, graphPadding, pointRadius, effectiveGraphWidth]);

  // Fonction pour calculer la position Y d'un point
  const getY = useCallback((value: number) => {
    return 40 + availableHeight - ((value - adjustedMin) / adjustedRange) * availableHeight;
  }, [adjustedMin, adjustedRange, availableHeight]);

  // Génération des lignes de la grille horizontale
  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = 40 + (i * availableHeight) / steps;
      lines.push(
        <Line
          key={`grid-${i}`}
          x1={graphPadding}
          y1={y}
          x2={graphWidth - graphPadding}
          y2={y}
          stroke="#2a2a2a"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      );
    }
    return lines;
  }, [graphPadding, graphWidth, availableHeight]);

  // Génération des étiquettes de l'axe Y
  const yLabels = useMemo(() => {
    const labels = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = 40 + (i * availableHeight) / steps;
      const value = adjustedMax - (i * adjustedRange) / steps;
      labels.push(
        <SvgText
          key={`ylabel-${i}`}
          x={graphPadding - 8}
          y={y + 4}
          fontSize="12"
          fill="#6b7280"
          textAnchor="end"
        >
          {value.toFixed(1)}
        </SvgText>
      );
    }
    return labels;
  }, [graphPadding, availableHeight, adjustedMax, adjustedRange]);

  // Génération des lignes connectant les points
  const connectionLines = useMemo(() => {
    if (filteredData.length < 2) return [];
    
    const lines = [];
    for (let i = 0; i < filteredData.length - 1; i++) {
      const currentX = getX(i);
      const currentY = getY(filteredData[i].value);
      const nextX = getX(i + 1);
      const nextY = getY(filteredData[i + 1].value);
      
      lines.push(
        <Line
          key={`line-${i}`}
          x1={currentX}
          y1={currentY}
          x2={nextX}
          y2={nextY}
          stroke="#22c55e"
          strokeWidth="3"
        />
      );
    }
    return lines;
  }, [filteredData, getX, getY]);

  // Génération des points
  const points = useMemo(() => {
    return filteredData.map((item, index) => {
      const x = getX(index);
      const y = getY(item.value);
      
      return (
        <Circle
          key={`point-${index}`}
          cx={x}
          cy={y}
          r={pointRadius}
          fill="#22c55e"
          stroke="#ffffff"
          strokeWidth="2"
        />
      );
    });
  }, [filteredData, getX, getY, pointRadius]);

  // Génération des étiquettes des valeurs
  const valueLabels = useMemo(() => {
    return filteredData.map((item, index) => {
      const x = getX(index);
      const y = getY(item.value);
      
      return (
        <SvgText
          key={`value-${index}`}
          x={x}
          y={y - 15}
          fontSize="12"
          fill="#22c55e"
          textAnchor="middle"
          fontWeight="bold"
        >
          {item.value.toFixed(1)}
        </SvgText>
      );
    });
  }, [filteredData, getX, getY]);

  // Génération des étiquettes de l'axe X (semaines)
  const xLabels = useMemo(() => {
    return filteredData.map((item, index) => {
      const x = getX(index);
      
      return (
        <SvgText
          key={`xlabel-${index}`}
          x={x}
          y={graphHeight - 15}
          fontSize="10"
          fill="#6b7280"
          textAnchor="middle"
        >
          {item.week.length > 8 ? `S${index + startIndex + 1}` : item.week}
        </SvgText>
      );
    });
  }, [filteredData, getX, graphHeight, startIndex]);

  const currentSelectionCount = endIndex - startIndex + 1;

  return (
    <View style={styles.container}>
      {/* Sélecteurs de plage */}
      {sortedData.length > 10 && (
        <View style={styles.selectorContainer}>
          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Début:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={startIndex}
                onValueChange={handleStartIndexChange}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {startOptions.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    color="#ffffff"
                    style={styles.pickerItem}
                  />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.selectorGroup}>
            <Text style={styles.selectorLabel}>Fin:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={endIndex}
                onValueChange={handleEndIndexChange}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {endOptions.map(option => (
                  <Picker.Item 
                    key={option.value} 
                    label={option.label} 
                    value={option.value}
                    color="#ffffff"
                    style={styles.pickerItem}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      )}

      {currentSelectionCount > 10 && (
        <Text style={styles.warningText}>
          Maximum 10 semaines peuvent être affichées simultanément
        </Text>
      )}

      <View style={styles.graphContainer}>
        <Svg width={graphWidth} height={graphHeight} style={styles.svg}>
          {/* Grille */}
          {gridLines}
          
          {/* Étiquettes Y */}
          {yLabels}
          
          {/* Lignes de connexion */}
          {connectionLines}
          
          {/* Points */}
          {points}
          
          {/* Étiquettes des valeurs */}
          {valueLabels}
          
          {/* Étiquettes X */}
          {xLabels}
        </Svg>
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {metric === 'charge' ? 'Charges (kg)' : 'Répétitions totales'}
        </Text>
        <Text style={styles.legendSubtext}>
          Affichage: {filteredData.length} semaine{filteredData.length > 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  selectorGroup: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: '#2a2a2a',
    height: 40,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  pickerItem: {
    backgroundColor: '#2a2a2a',
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#2a2a2a',
  },
  warningText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  graphContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  legend: {
    alignItems: 'center',
  },
  legendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  legendSubtext: {
    color: '#6b7280',
    fontSize: 12,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default PerformanceGraph;