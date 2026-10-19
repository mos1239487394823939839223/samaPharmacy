/**
 * Prescription entry for scheduled items (BR-7). Used by the till before a
 * controlled sale and by the narcotics register to correct an entry. Every
 * field is mandatory; the patient ID is the 14-digit Egyptian national ID.
 */

import { useState } from 'react';
import type { PrescriptionInput } from '@pharmacy/shared';
import { toAsciiDigits, todayLocal } from '@pharmacy/core';
import { ar } from '../i18n/ar';

interface Props {
  title?: string;
  intro?: string;
  initial?: Partial<PrescriptionInput> | null;
  /** Extra field (the correction reason) rendered above the buttons. */
  withReason?: boolean;
  submitLabel?: string;
  onSubmit: (p: PrescriptionInput, reason: string) => void;
  onCancel: () => void;
}

export function PrescriptionDialog({ title, intro, initial, withReason, submitLabel, onSubmit, onCancel }: Props) {
  const [no, setNo] = useState(initial?.prescriptionNo ?? '');
  const [date, setDate] = useState(initial?.prescriptionDate ?? todayLocal());
  const [doctor, setDoctor] = useState(initial?.doctorName ?? '');
  const [syndicate, setSyndicate] = useState(initial?.doctorSyndicateNo ?? '');
  const [patient, setPatient] = useState(initial?.patientName ?? '');
  const [patientId, setPatientId] = useState(initial?.patientIdNo ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (![no, doctor, syndicate, patient, patientId].every((v) => v.trim()) || (withReason && !reason.trim())) {
      return setError(ar.common.required);
    }
    if (!/^\d{14}$/.test(patientId)) return setError(ar.prescription.idInvalid);
    if (date && date > todayLocal()) return setError(ar.prescription.dateFuture);
    onSubmit(
      {
        prescriptionNo: no.trim(),
        prescriptionDate: date || null,
        doctorName: doctor.trim(),
        doctorSyndicateNo: syndicate.trim(),
        patientName: patient.trim(),
        patientIdNo: patientId,
      },
      reason.trim()
    );
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form
        className="modal panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => e.code === 'Escape' && onCancel()}
      >
        <h2 className="section-heading">{title ?? ar.prescription.title}</h2>
        <p className="muted">{intro ?? ar.prescription.intro}</p>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.no}</span>
            <input className="field" dir="ltr" autoFocus value={no} onChange={(e) => setNo(toAsciiDigits(e.target.value))} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.date}</span>
            <input className="field" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.doctor}</span>
            <input className="field" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.syndicate}</span>
            <input className="field" dir="ltr" value={syndicate} onChange={(e) => setSyndicate(toAsciiDigits(e.target.value))} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.patient}</span>
            <input className="field" value={patient} onChange={(e) => setPatient(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.prescription.patientId}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              maxLength={14}
              value={patientId}
              onChange={(e) => setPatientId(toAsciiDigits(e.target.value).replace(/\D/g, ''))}
            />
          </label>
        </div>
        {withReason && (
          <label className="formfield">
            <span className="formfield__label">{ar.narcotics.reason}</span>
            <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn--primary">
            {submitLabel ?? ar.prescription.save}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {ar.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
