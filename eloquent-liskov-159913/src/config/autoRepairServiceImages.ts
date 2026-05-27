/** Auto-repair service → image mapping */
import serviceOilChange from "@/assets/service-oil-change.jpg";
import serviceBrakePads from "@/assets/service-brake-pads.jpg";
import serviceBrakeRotor from "@/assets/service-brake-rotor.jpg";
import serviceTransmission from "@/assets/service-transmission.jpg";
import serviceCoolant from "@/assets/service-coolant.jpg";
import servicePowerSteering from "@/assets/service-power-steering.jpg";
import serviceEngine from "@/assets/service-engine.jpg";
import serviceSparkPlug from "@/assets/service-spark-plug.jpg";
import serviceBelt from "@/assets/service-belt.jpg";
import serviceDiagnostic from "@/assets/service-diagnostic.jpg";
import serviceTire from "@/assets/service-tire.jpg";
import serviceAlignment from "@/assets/service-alignment.jpg";
import serviceSuspension from "@/assets/service-suspension.jpg";
import serviceElectrical from "@/assets/service-electrical.jpg";
import serviceAC from "@/assets/service-ac.jpg";
import serviceExhaust from "@/assets/service-exhaust.jpg";
import serviceLights from "@/assets/service-lights.jpg";
import serviceWiper from "@/assets/service-wiper.jpg";
import serviceGasket from "@/assets/service-gasket.jpg";
import serviceFuel from "@/assets/service-fuel.jpg";
import serviceBodyPaint from "@/assets/service-body-paint.jpg";
import serviceDetailing from "@/assets/service-detailing.jpg";

/**
 * Each entry: [keyword to match in service name (lowercase), image path]
 * Order matters — first match wins.
 */
const SERVICE_IMAGE_RULES: [string, string][] = [
  // Oil & Fluids
  ["oil change", serviceOilChange],
  ["transmission fluid", serviceTransmission],
  ["coolant", serviceCoolant],
  ["brake fluid", serviceBrakePads],
  ["power steering", servicePowerSteering],

  // Brake System
  ["brake pad", serviceBrakePads],
  ["brake rotor", serviceBrakeRotor],
  ["brake caliper", serviceBrakeRotor],
  ["brake line", serviceBrakePads],

  // Engine
  ["engine tune", serviceEngine],
  ["spark plug", serviceSparkPlug],
  ["timing belt", serviceBelt],
  ["serpentine belt", serviceBelt],
  ["engine diagnostic", serviceDiagnostic],
  ["head gasket", serviceGasket],
  ["engine mount", serviceEngine],

  // Transmission
  ["transmission", serviceTransmission],
  ["clutch", serviceTransmission],

  // Suspension & Steering
  ["shock", serviceSuspension],
  ["strut", serviceSuspension],
  ["ball joint", serviceSuspension],
  ["tie rod", serviceSuspension],
  ["control arm", serviceSuspension],
  ["wheel bearing", serviceSuspension],
  ["suspension", serviceSuspension],
  ["steering", servicePowerSteering],

  // Electrical
  ["battery", serviceElectrical],
  ["alternator", serviceElectrical],
  ["starter", serviceElectrical],
  ["electrical", serviceElectrical],
  ["fuse", serviceElectrical],

  // HVAC
  ["a/c", serviceAC],
  ["ac ", serviceAC],
  ["air conditioning", serviceAC],
  ["heater", serviceAC],
  ["cabin filter", serviceAC],

  // Exhaust
  ["exhaust", serviceExhaust],
  ["muffler", serviceExhaust],
  ["catalytic", serviceExhaust],

  // Tires & Wheels
  ["tire", serviceTire],
  ["wheel alignment", serviceAlignment],
  ["alignment", serviceAlignment],
  ["rotation", serviceTire],
  ["balancing", serviceTire],
  ["flat", serviceTire],

  // Lights
  ["headlight", serviceLights],
  ["taillight", serviceLights],
  ["bulb", serviceLights],
  ["light", serviceLights],

  // Wipers
  ["wiper", serviceWiper],
  ["windshield", serviceWiper],

  // Fuel
  ["fuel", serviceFuel],
  ["injector", serviceFuel],

  // Body & Paint
  ["paint", serviceBodyPaint],
  ["dent", serviceBodyPaint],
  ["bumper", serviceBodyPaint],
  ["body", serviceBodyPaint],

  // Detailing
  ["detail", serviceDetailing],
  ["polish", serviceDetailing],
  ["wax", serviceDetailing],

  // Additional mappings
  ["cv axle", serviceTransmission],
  ["differential", serviceTransmission],
  ["thermostat", serviceCoolant],
  ["radiator", serviceCoolant],
  ["wheel bearing", serviceSuspension],
  ["compressor", serviceAC],

  // General engine fallback
  ["engine", serviceEngine],
  ["diagnostic", serviceDiagnostic],
  ["inspection", serviceDiagnostic],
  ["brake", serviceBrakePads],
];

/** Returns the matching service image for a given service name, or empty string */
export function getServiceImage(serviceName: string): string {
  if (!serviceName) return "";
  const lower = serviceName.toLowerCase();
  for (const [keyword, image] of SERVICE_IMAGE_RULES) {
    if (lower.includes(keyword)) return image;
  }
  return "";
}
