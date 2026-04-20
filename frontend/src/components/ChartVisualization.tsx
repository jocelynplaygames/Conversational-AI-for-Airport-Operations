import React, { useRef, useEffect, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Button } from './ui/button';
import { Download, Image as ImageIcon, FileText, Check } from 'lucide-react';

ChartJS.register(...registerables);

interface ChartVisualizationProps {
  chartConfig: {
    type: string;
    title?: string;
    data: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
        tension?: number;
        fill?: boolean;
      }>;
    };
    options?: any;
  };
  insightsText?: string;
}

export default function ChartVisualization({ chartConfig, insightsText }: ChartVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: chartConfig.type as any,
      data: chartConfig.data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: !!chartConfig.title,
            text: chartConfig.title || '',
            font: {
              size: 16,
              weight: 'bold' as const,
            },
          },
        },
        ...chartConfig.options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [chartConfig]);

  const downloadChartWithInsights = async () => {
    if (!canvasRef.current) return;

    const padding = 80;
    const chartScale = 2; // 2x larger chart
    const fontSize = 24; // Much larger font (was 18)
    const lineHeight = 36; // More spacing (was 28)
    const titleFontSize = 32; // Larger title (was 24)
    
    // Calculate text dimensions
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    const maxTextWidth = (canvasRef.current.width * chartScale) - (padding * 3);
    
    // Wrap text
    const words = insightsText?.split(' ') || [];
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = tempCtx.measureText(testLine);
      
      if (metrics.width > maxTextWidth && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    const textBlockHeight = insightsText 
      ? (lines.length * lineHeight) + titleFontSize + 100
      : 0;
    
    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    const chartWidth = canvasRef.current.width * chartScale;
    const chartHeight = canvasRef.current.height * chartScale;
    
    exportCanvas.width = chartWidth + (padding * 2);
    exportCanvas.height = chartHeight + textBlockHeight + (padding * 3);
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw subtle border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, exportCanvas.width - 4, exportCanvas.height - 4);

    // Draw the chart (2x scaled)
    ctx.drawImage(
      canvasRef.current, 
      padding, 
      padding, 
      chartWidth, 
      chartHeight
    );

    // Draw insights text
    if (insightsText && lines.length > 0) {
      const textStartY = chartHeight + (padding * 2);
      
      // Background for text section
      ctx.fillStyle = '#f3f4f6';
      const textBoxPadding = 40;
      ctx.fillRect(
        padding, 
        textStartY - textBoxPadding, 
        exportCanvas.width - (padding * 2), 
        textBlockHeight + textBoxPadding
      );
      
      // Border around text section
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        padding, 
        textStartY - textBoxPadding, 
        exportCanvas.width - (padding * 2), 
        textBlockHeight + textBoxPadding
      );
      
      // Title with icon
      ctx.fillStyle = '#111827';
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText('📊 Analysis:', padding + 40, textStartY + 20);
      
      // Divider line under title
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding + 40, textStartY + 40);
      ctx.lineTo(exportCanvas.width - padding - 40, textStartY + 40);
      ctx.stroke();
      
      // Text content with better styling
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#1f2937';
      
      let y = textStartY + 75;
      for (const line of lines) {
        ctx.fillText(line, padding + 40, y);
        y += lineHeight;
      }
    }
    
    // Footer with branding
    const footerY = exportCanvas.height - 35;
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillText('AIport Intelligence', padding, footerY);
    
    ctx.font = '16px Inter, system-ui, sans-serif';
    const dateText = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    ctx.fillText(dateText, exportCanvas.width - padding - ctx.measureText(dateText).width, footerY);

    // Download
    const link = document.createElement('a');
    link.download = `aiport-analysis-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const downloadChartOnly = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `aiport-chart-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const downloadHighResPNG = () => {
    if (!chartRef.current || !canvasRef.current) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasRef.current.width * 2;
    exportCanvas.height = canvasRef.current.height * 2;
    
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.scale(2, 2);

    const tempChart = new ChartJS(exportCtx, {
      type: chartConfig.type as any,
      data: chartConfig.data,
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: 'top' as const,
          },
          title: {
            display: !!chartConfig.title,
            text: chartConfig.title || '',
            font: {
              size: 16,
              weight: 'bold' as const,
            },
          },
        },
        ...chartConfig.options,
      },
    });

    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `aiport-chart-highres-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      
      tempChart.destroy();
    }, 100);
  };

  const copyImageAndText = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current?.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      const clipboardItems: ClipboardItem[] = [];

      if (insightsText) {
        clipboardItems.push(
          new ClipboardItem({
            'image/png': blob,
            'text/plain': new Blob([insightsText], { type: 'text/plain' }),
          })
        );
      } else {
        clipboardItems.push(
          new ClipboardItem({ 'image/png': blob })
        );
      }

      await navigator.clipboard.write(clipboardItems);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      if (insightsText) {
        await navigator.clipboard.writeText(insightsText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const copyTextOnly = async () => {
    if (!insightsText) return;

    try {
      await navigator.clipboard.writeText(insightsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Chart Canvas */}
      <div className="relative bg-white rounded-lg p-4">
        <canvas ref={canvasRef} />
      </div>

      {/* Export Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Download Options */}
        <div className="flex items-center gap-2">
          {insightsText && (
            <Button
              variant="default"
              size="sm"
              onClick={downloadChartWithInsights}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download with Insights
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadChartOnly}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Chart Only
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadHighResPNG}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            High-Res
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Copy Options */}
        <div className="flex items-center gap-2">
          {insightsText && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={copyImageAndText}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    Copy Image + Text
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={copyTextOnly}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Copy Text
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Helper text */}
      {insightsText && (
        <p className="text-xs text-gray-500">
          💡 Tip: "Download with Insights" creates a professional report with 2x size chart and large (24px) readable analysis text
        </p>
      )}
    </div>
  );
}