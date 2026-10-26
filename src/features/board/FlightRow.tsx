import { Link } from "@/i18n/navigation";
import { FlapText, type FlapTone } from "./FlapText";

export type FlightStatus = "departing" | "scheduled" | "arrived";

type Props = {
  href: string;
  number: string;
  name: string;
  duration?: string;
  status: FlightStatus;
  statusLabel: string;
  locale: string;
};

const STATUS_TONE: Record<FlightStatus, FlapTone> = {
  departing: "amber",
  scheduled: "flap",
  arrived: "done",
};

/**
 * One departure: the whole row is the link to the lesson. Wide screens set the
 * name and status as plates; narrow screens show them as single strips so the
 * row never overflows. The accessible name comes from the visually hidden text.
 */
export function FlightRow({
  href,
  number,
  name,
  duration,
  status,
  statusLabel,
  locale,
}: Props) {
  const tone = STATUS_TONE[status];
  return (
    <li className="flight-row" data-status={status}>
      <Link href={href} className="flight-row__link">
        <span className="flight-row__cell flight-row__cell--number">
          <FlapText text={number} size="md" />
        </span>
        <span className="flight-row__cell flight-row__cell--name">
          <span className="flight-row__plates">
            <FlapText text={name} locale={locale} size="md" />
          </span>
          <span className="flight-row__strip flap-strip">
            <span aria-hidden="true">{name}</span>
            <span className="sr-only">{name}</span>
          </span>
        </span>
        <span className="flight-row__cell flight-row__cell--time">
          {duration ? <FlapText text={duration} size="sm" /> : null}
        </span>
        <span className="flight-row__cell flight-row__cell--status">
          <span className="flight-row__plates">
            <FlapText text={statusLabel} size="sm" tone={tone} />
          </span>
          <span className="flight-row__strip flap-strip" data-tone={tone}>
            <span aria-hidden="true">{statusLabel}</span>
            <span className="sr-only">{statusLabel}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
