import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { jsPDF } from 'jspdf';
import logo from '../assets/mywellfie-header-logo.png';
import media from '../style/media';
import { ReportVitalSigns } from '../types';
import { formatWellnessIndexDisplay, wellnessLevelLabel } from '../utils/wellnessScore';
import { sdkConfidenceLabel } from '../utils/vitalsMetadata';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px;
  box-sizing: border-box;
`;

const Dialog = styled.div`
  width: min(100%, 520px);
  max-height: 92vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.25);
  padding: 14px;
  box-sizing: border-box;
  ${media.tablet`
    padding: 20px;
  `}
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const Logo = styled.img`
  width: min(230px, 70vw);
  height: auto;
  object-fit: contain;
`;

const CloseButton = styled.button`
  border: 0;
  background: transparent;
  font-size: 20px;
  line-height: 20px;
  cursor: pointer;
  color: #5d5b73;
  padding: 4px;
`;

const Title = styled.h3`
  margin-top: 14px;
  font-size: 18px;
  color: #1d2340;
`;

const Subtitle = styled.p`
  margin-top: 6px;
  color: #666a86;
  font-size: 13px;
`;

const Table = styled.div`
  margin-top: 14px;
  border: 1px solid #ebedf5;
  border-radius: 10px;
  overflow: hidden;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 10px;
  padding: 12px 14px;
  font-size: 14px;
  background: #ffffff;

  &:nth-child(odd) {
    background: #fafbff;
  }
`;

const Label = styled.div`
  color: #3f4663;
  font-weight: 500;
`;

const Value = styled.div`
  color: #131a3b;
  font-weight: 700;
  text-align: right;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
`;

const SecondaryButton = styled.button`
  border: 1px solid #d5d9ec;
  background: #ffffff;
  color: #2c3458;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  border: 0;
  background: #1d305e;
  color: #ffffff;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
`;

const getVitalDisplayValue = (
  isEnabled: boolean,
  value: any,
  fallback = '—',
): string => {
  if (!isEnabled) {
    return 'N/A';
  }
  return value ?? fallback;
};

const confSuffix = (level?: number | null): string => {
  const label = sdkConfidenceLabel(level);
  return label && label !== 'Unknown' ? ` (${label} conf.)` : '';
};

const getBloodPressureValue = (report: ReportVitalSigns): string => {
  if (!report.bloodPressure.isEnabled) {
    return 'N/A';
  }
  const systolic = report.bloodPressure.value?.systolic;
  const diastolic = report.bloodPressure.value?.diastolic;
  return systolic && diastolic ? `${systolic}/${diastolic}` : '—';
};

const withUnit = (value: string, unit: string): string =>
  value === 'N/A' || value === '—' ? value : `${value} ${unit}`;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const toFormattedDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleString() : new Date().toLocaleString();

interface IReportModal {
  open: boolean;
  report?: ReportVitalSigns;
  rawResults?: any;
  generatedAt?: string;
  onClose: () => void;
}

const ReportModal = ({ open, report, rawResults, generatedAt, onClose }: IReportModal) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const rows = useMemo(() => {
    if (!report) {
      return [];
    }
    const normalizedStress = rawResults?.normalizedStressIndex?.value;
    const wellnessLevel = rawResults?.wellnessLevel?.value;

    return [
      {
        label: 'Pulse Rate (PR)',
        value:
          withUnit(
            `${getVitalDisplayValue(report.pulseRate.isEnabled, report.pulseRate.value)}`,
            'bpm',
          ) + confSuffix(report.pulseRate.confidenceLevel),
      },
      {
        label: 'Respiration Rate (RR)',
        value:
          withUnit(
            `${getVitalDisplayValue(report.respirationRate.isEnabled, report.respirationRate.value)}`,
            'brpm',
          ) + confSuffix(report.respirationRate.confidenceLevel),
      },
      {
        label: 'Stress Level (SL)',
        value: `${getVitalDisplayValue(report.stress.isEnabled, report.stress.value)}`,
      },
      {
        label: 'Normalized Stress Index',
        value:
          normalizedStress != null
            ? `${Math.round(normalizedStress)}%`
            : '—',
      },
      {
        label: 'SDNN',
        value:
          withUnit(
            `${getVitalDisplayValue(report.hrvSdnn.isEnabled, report.hrvSdnn.value)}`,
            'ms',
          ) + confSuffix(report.hrvSdnn.confidenceLevel),
      },
      {
        label: 'Blood Pressure (BP)',
        value: getBloodPressureValue(report),
      },
      {
        label: 'SpO2',
        value:
          withUnit(
            `${getVitalDisplayValue(report.spo2.isEnabled, report.spo2.value)}`,
            '%',
          ) + confSuffix(report.spo2.confidenceLevel),
      },
      {
        label: 'Hemoglobin (Hb) *',
        value: withUnit(
          `${getVitalDisplayValue(report.hemoglobin.isEnabled, report.hemoglobin.value)}`,
          'g/dL',
        ),
      },
      {
        label: 'Hemoglobin A1c *',
        value: withUnit(
          `${getVitalDisplayValue(report.hemoglobinA1c.isEnabled, report.hemoglobinA1c.value)}`,
          '%',
        ),
      },
      {
        label: 'Wellness Index',
        value: (() => {
          if (!report.wellnessIndex.isEnabled) {
            return getVitalDisplayValue(false, report.wellnessIndex.value);
          }
          return formatWellnessIndexDisplay(report.wellnessIndex.value);
        })(),
      },
      {
        label: 'Wellness Level',
        value: wellnessLevel != null ? wellnessLevelLabel(wellnessLevel) : '—',
      },
    ];
  }, [report, rawResults]);

  const [showRaw, setShowRaw] = useState(false);

  const onDownloadPdf = useCallback(async () => {
    if (!report || isDownloading) {
      return;
    }
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const response = await fetch(logo);
      const logoBlob = await response.blob();
      const logoDataUrl = await blobToDataUrl(logoBlob);
      doc.addImage(logoDataUrl, 'PNG', 40, 24, 230, 62);
      doc.setFontSize(18);
      doc.text('Vital Report', 40, 108);
      doc.setFontSize(11);
      doc.setTextColor(90, 95, 120);
      doc.text(`Generated at: ${toFormattedDate(generatedAt)}`, 40, 128);

      let y = 164;
      doc.setTextColor(34, 41, 77);
      rows.forEach(({ label, value }) => {
        doc.setFillColor(248, 250, 255);
        doc.roundedRect(40, y - 18, 515, 28, 4, 4, 'F');
        doc.setFontSize(12);
        doc.text(label, 54, y);
        doc.text(value, 540, y, { align: 'right' });
        y += 36;
      });

      doc.save(`vital-report-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error creating report PDF', error);
    } finally {
      setIsDownloading(false);
    }
  }, [rows, report, generatedAt, isDownloading]);

  if (!open || !report) {
    return null;
  }

  return (
    <Backdrop onClick={onClose}>
      <Dialog onClick={(event) => event.stopPropagation()}>
        <Header>
          <Logo src={logo} alt={'MyWellfie'} />
          <CloseButton onClick={onClose} aria-label={'Close report'}>
            ×
          </CloseButton>
        </Header>
        <Title>Vital Report</Title>
        <Subtitle>Generated at: {toFormattedDate(generatedAt)}</Subtitle>
        
        {!showRaw ? (
          <Table>
            {rows.map(({ label, value }) => (
              <Row key={label}>
                <Label>{label}</Label>
                <Value>{value}</Value>
              </Row>
            ))}
          </Table>
        ) : (
          <div style={{ marginTop: '14px', background: '#f5f7fa', padding: '10px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto' }}>
            <pre>{JSON.stringify(rawResults, null, 2)}</pre>
          </div>
        )}

        <Actions>
          <SecondaryButton onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? 'Hide Raw' : 'Debug Raw Data'}
          </SecondaryButton>
          <PrimaryButton onClick={onDownloadPdf}>
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </PrimaryButton>
        </Actions>
      </Dialog>
    </Backdrop>
  );
};

export default ReportModal;
