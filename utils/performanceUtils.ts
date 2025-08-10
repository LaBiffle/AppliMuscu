import { SessionStorage } from './sessionStorage';
import { ProgramStorage } from './storage';
import { WeekData } from '@/types/session';
import { Program } from '@/types/program';

export interface PerformanceDataPoint {
  week: string;
  value: number;
  date: string;
}

export async function getPerformanceData(
  programId: string,
  exerciseId?: string,
  metricType: 'charge' | 'repetitions' = 'charge'
): Promise<PerformanceDataPoint[]> {
  try {
    // Récupérer toutes les données de semaine pour ce programme
    const weekDataList = await SessionStorage.getWeekDataForProgram(programId);
    
    if (weekDataList.length === 0) {
      return [];
    }

    // Récupérer le programme pour avoir les détails des exercices
    const program = await ProgramStorage.getProgram(programId);
    if (!program) {
      return [];
    }

    const performancePoints: PerformanceDataPoint[] = [];

    // Trier les semaines par date
    const sortedWeeks = weekDataList.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const weekData of sortedWeeks) {
      let weekValue = 0;
      let exerciseCount = 0;

      // Parcourir toutes les sessions de la semaine
      Object.entries(weekData.sessions).forEach(([dayIndexStr, sessionData]) => {
        const dayIndex = parseInt(dayIndexStr);
        const dayBlocks = program.blocks[dayIndex] || [];

        dayBlocks.forEach(block => {
          block.exercises.forEach(exercise => {
            // Si un exercice spécifique est demandé, le filtrer
            if (exerciseId && exercise.id !== exerciseId) {
              return;
            }

            if (metricType === 'charge') {
              // Extraire la valeur numérique de la charge
              const chargeStr = sessionData.charges[exercise.id] || '';
              const chargeValue = extractNumericValue(chargeStr);
              if (chargeValue > 0) {
                weekValue += chargeValue;
                exerciseCount++;
              }
            } else if (metricType === 'repetitions') {
              // Compter les répétitions complétées
              const seriesData = sessionData.completedSeries[block.id]?.[exercise.id] || [];
              const completedSeries = seriesData.filter(Boolean).length;
              const totalReps = completedSeries * exercise.repetitions;
              if (totalReps > 0) {
                weekValue += totalReps;
                exerciseCount++;
              }
            }
          });
        });
      });

      // Calculer la moyenne si plusieurs exercices
      if (exerciseCount > 0) {
        const averageValue = exerciseId ? weekValue : weekValue / exerciseCount;
        performancePoints.push({
          week: weekData.weekName,
          value: Math.round(averageValue * 100) / 100, // Arrondir à 2 décimales
          date: weekData.date
        });
      }
    }

    return performancePoints;
  } catch (error) {
    console.error('Error getting performance data:', error);
    return [];
  }
}

function extractNumericValue(chargeStr: string): number {
  if (!chargeStr) return 0;
  
  // Extraire le premier nombre trouvé dans la chaîne
  const match = chargeStr.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export function getPerformanceTrend(data: PerformanceDataPoint[]): {
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
} {
  if (data.length < 2) {
    return { trend: 'stable', change: 0, changePercent: 0 };
  }

  const latest = data[data.length - 1].value;
  const previous = data[data.length - 2].value;
  const change = latest - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

  return {
    trend,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}