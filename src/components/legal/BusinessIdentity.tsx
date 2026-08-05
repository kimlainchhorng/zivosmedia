import {
  COMPANY_INFO,
  formatPostalAddress,
  hasPostalAddress,
  type PostalAddress,
} from "@/config/legalContent";

/**
 * The published business identity of ZIVO, rendered from `COMPANY_INFO` alone.
 *
 * This exists so there is exactly one answer to "who is the merchant, and where
 * are they" across the footer, the contact page, the Terms, and the structured
 * data. Payment-processor reviews compare those surfaces against each other and
 * against the payment account; when each surface owned its own copy they
 * drifted, and a reviewer reads drift as misrepresentation.
 *
 * Anything `COMPANY_INFO` does not know is omitted rather than stubbed. A block
 * that renders no address is a signal to go fill `COMPANY_INFO` in -- it is not
 * a bug to paper over with a placeholder.
 */

function AddressLines({ address }: { address: PostalAddress }) {
  const lines = formatPostalAddress(address);
  if (lines.length === 0) return null;

  return (
    <address className="not-italic">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </address>
  );
}

export interface BusinessIdentityProps {
  /**
   * Heading rendered above the block. Omit on surfaces that already carry their
   * own heading, such as the Terms contact accordion.
   */
  heading?: string;
  className?: string;
}

export default function BusinessIdentity({ heading, className }: BusinessIdentityProps) {
  const showRegistered = hasPostalAddress(COMPANY_INFO.registeredAddress);
  const showOperations = hasPostalAddress(COMPANY_INFO.operationsAddress);

  return (
    <div className={className}>
      {heading ? <h3 className="font-semibold text-foreground mb-3">{heading}</h3> : null}

      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-foreground">{COMPANY_INFO.name}</p>
          {/* The group structure, stated rather than implied. A reviewer seeing
              Khmer payment rails on a site that names only a Delaware entity
              has to guess at the relationship; this removes the guess. */}
          <p className="text-muted-foreground">
            Incorporated in {COMPANY_INFO.stateOfFormation}, {COMPANY_INFO.registeredAddress.country}. Operating
            in {COMPANY_INFO.operationsAddress.country} as {COMPANY_INFO.dba}.
          </p>
        </div>

        {showRegistered && (
          <div>
            <p className="font-medium text-foreground">Registered office</p>
            <div className="text-muted-foreground">
              <AddressLines address={COMPANY_INFO.registeredAddress} />
            </div>
          </div>
        )}

        {showOperations && (
          <div>
            <p className="font-medium text-foreground">Operations</p>
            <div className="text-muted-foreground">
              <AddressLines address={COMPANY_INFO.operationsAddress} />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p>
            <span className="font-medium text-foreground">Support: </span>
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="text-primary hover:underline">
              {COMPANY_INFO.supportEmail}
            </a>
          </p>
          <p>
            <span className="font-medium text-foreground">Billing: </span>
            <a href={`mailto:${COMPANY_INFO.billingEmail}`} className="text-primary hover:underline">
              {COMPANY_INFO.billingEmail}
            </a>
          </p>
          <p>
            <span className="font-medium text-foreground">Legal: </span>
            <a href={`mailto:${COMPANY_INFO.legalEmail}`} className="text-primary hover:underline">
              {COMPANY_INFO.legalEmail}
            </a>
          </p>
          {COMPANY_INFO.supportPhone.trim() && (
            <p>
              <span className="font-medium text-foreground">Phone: </span>
              <a
                href={`tel:${COMPANY_INFO.supportPhone.replace(/[^+\d]/g, "")}`}
                className="text-primary hover:underline"
              >
                {COMPANY_INFO.supportPhone}
              </a>
            </p>
          )}
          <p className="text-muted-foreground">{COMPANY_INFO.supportHours}</p>
        </div>

        {/* Charges appear under this name. Publishing it is what lets a customer
            recognise their own statement line instead of disputing it. */}
        <p className="text-muted-foreground">
          Card statements show charges as <strong className="text-foreground">{COMPANY_INFO.statementDescriptor}</strong>.
        </p>
      </div>
    </div>
  );
}
