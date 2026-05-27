/**
 * City-specific FAQ data for destination pages
 * Each city has unique questions to avoid duplicate content
 */

import type { FAQItem } from "@/components/shared/FAQSchema";

// =========================================
// FLIGHT ROUTE FAQs
// =========================================

export const flightRouteFAQs: Record<string, FAQItem[]> = {
  "chicago-to-new-york": [
    { question: "How long is the flight from Chicago to New York?", answer: "Direct flights from Chicago to New York take approximately 2 hours and 15 minutes. Both O'Hare (ORD) and Midway (MDW) airports offer service to JFK, LaGuardia, and Newark airports." },
    { question: "What is the cheapest day to fly from Chicago to New York?", answer: "Typically, Tuesdays and Wednesdays offer the lowest fares for Chicago to New York flights. Avoiding Friday evenings and Monday mornings helps you save significantly on this popular business route." },
    { question: "Which Chicago airport is better for NYC flights?", answer: "O'Hare offers more flight options and airlines, while Midway primarily serves Southwest. Compare both airports on ZIVO to find the best combination of price and convenience." },
    { question: "How far in advance should I book Chicago to NYC flights?", answer: "For the best prices, book 3-4 weeks ahead for domestic flights. Last-minute bookings on this route can be expensive due to high business travel demand." },
    { question: "Does ZIVO charge booking fees for flights?", answer: "No, ZIVO does not charge any booking fees. We help you compare prices across 500+ airlines and travel sites, then redirect you to our trusted partners to complete your booking securely." }
  ],
  "chicago-to-los-angeles": [
    { question: "How long does it take to fly from Chicago to Los Angeles?", answer: "Direct flights from Chicago to Los Angeles average 4 hours heading westbound. Return flights are slightly faster at around 3 hours 45 minutes due to prevailing winds." },
    { question: "Which airlines fly from Chicago to LA?", answer: "Major carriers including United, American, Delta, Southwest, and Spirit all operate Chicago to Los Angeles routes. ZIVO compares all airlines simultaneously to find you the best deal." },
    { question: "When is the cheapest time to fly to Los Angeles from Chicago?", answer: "Late January through early March typically offers the lowest fares, avoiding both holiday travel and peak summer demand. Midweek departures also provide significant savings." },
    { question: "What airports serve the Chicago to LA route?", answer: "Chicago flights depart from O'Hare (ORD) and Midway (MDW). Los Angeles arrivals include LAX, Burbank (BUR), Long Beach (LGB), and Ontario (ONT) - comparing all options can reveal savings." },
    { question: "How does ZIVO find cheap flights?", answer: "ZIVO searches across 500+ airlines and travel sites simultaneously, comparing real-time prices to show you the best available options. We don't sell tickets directly - you book through our trusted partners." }
  ],
  "new-york-to-miami": [
    { question: "How long is the flight from New York to Miami?", answer: "Direct flights from New York to Miami take approximately 3 hours. All three NYC-area airports (JFK, LaGuardia, Newark) offer service to Miami International and Fort Lauderdale." },
    { question: "Is it cheaper to fly into Miami or Fort Lauderdale?", answer: "Fort Lauderdale (FLL) often offers lower fares than Miami International (MIA). It's about 30 miles north of Miami Beach and easily accessible. Compare both options on ZIVO." },
    { question: "What is peak season for New York to Miami flights?", answer: "December through April is peak season when New Yorkers escape winter. Expect higher prices during this period, especially around major holidays and spring break weeks." },
    { question: "Which airline is best for NYC to Miami?", answer: "JetBlue and American Airlines are popular choices with excellent service. Spirit and Frontier offer budget options. ZIVO shows you all options so you can choose based on your priorities." },
    { question: "Can I book directly through ZIVO?", answer: "ZIVO is a comparison platform - we help you find the best prices, then redirect you to book directly with airlines or trusted travel partners. This ensures you get genuine fares with full support." }
  ],
  "los-angeles-to-las-vegas": [
    { question: "How short is the flight from LA to Las Vegas?", answer: "The LA to Las Vegas flight is one of the shortest in the US, taking just about 1 hour. Some travelers compare this to the 4+ hour drive, though driving offers flexibility." },
    { question: "Is it better to fly or drive from LA to Vegas?", answer: "Flying takes 1 hour versus 4+ hours driving, but factor in airport time. Flights offer speed; driving offers flexibility and avoids rental car costs. Compare flight prices on ZIVO to help decide." },
    { question: "Which LA airport is best for Las Vegas flights?", answer: "LAX has the most options, but Burbank (BUR) offers shorter security lines and easier access from many LA neighborhoods. Long Beach and Ontario also serve this route." },
    { question: "When are Vegas flights cheapest from LA?", answer: "Weekday flights are significantly cheaper than Friday-Sunday departures. Major convention weeks and holidays see the highest prices. Check ZIVO for current pricing across all dates." },
    { question: "What happens after I search on ZIVO?", answer: "After searching, ZIVO shows you flight options from 500+ airlines and travel sites. When you select a flight, we redirect you to the airline or partner site to complete your secure booking." }
  ],
  "miami-to-new-york": [
    { question: "What is the flight time from Miami to New York?", answer: "Direct flights from Miami to New York take approximately 3 hours. You can depart from Miami International or Fort Lauderdale and arrive at JFK, LaGuardia, or Newark." },
    { question: "How much does a Miami to NYC flight cost?", answer: "Prices vary by season, airline, and booking timing. Economy fares can range from under $100 to over $400. ZIVO compares real-time prices across 500+ sources to find the best current deals." },
    { question: "What's the best month to fly from Miami to New York?", answer: "April through June offers pleasant weather at both ends without peak holiday pricing. September and early October are also good for avoiding summer crowds and winter premiums." },
    { question: "Does ZIVO include all airlines?", answer: "Yes, ZIVO searches across 500+ airlines and travel sites including major carriers (American, Delta, United, JetBlue) and budget airlines (Spirit, Frontier) to give you comprehensive options." },
    { question: "Are prices on ZIVO guaranteed?", answer: "Prices shown are indicative and sourced in real-time from our partners. Final prices are confirmed on the partner booking site, where you complete your purchase securely." }
  ],
  "dallas-to-los-angeles": [
    { question: "How long is the flight from Dallas to Los Angeles?", answer: "Direct flights from Dallas to Los Angeles take about 3 hours. Both DFW Airport and Dallas Love Field offer service to LAX and other Southern California airports." },
    { question: "Which Dallas airport should I use for LA flights?", answer: "DFW offers more carriers and connections, while Love Field primarily serves Southwest Airlines. Both are valid options - ZIVO compares flights from both to find your best deal." },
    { question: "When should I book Dallas to LA flights?", answer: "Booking 3-6 weeks ahead typically offers the best prices. Last-minute bookings can be expensive on this popular route, especially for Friday and Monday business travel." },
    { question: "What alternatives to LAX should I consider?", answer: "Burbank, Long Beach, and Ontario airports often have lower fares and shorter lines. ZIVO searches all Southern California airports to help you find potential savings." },
    { question: "How do I book after finding a flight on ZIVO?", answer: "When you find a flight you like, click to view the deal. We'll redirect you to the airline or our trusted travel partner where you can complete your booking with full customer support." }
  ],
  "atlanta-to-new-york": [
    { question: "How long does it take to fly from Atlanta to NYC?", answer: "Direct flights from Atlanta to New York take about 2 hours. Hartsfield-Jackson offers numerous daily departures to JFK, LaGuardia, and Newark airports." },
    { question: "Which airline dominates the Atlanta to NYC route?", answer: "Delta operates the most flights as Atlanta is their primary hub. However, other carriers including JetBlue, American, United, Spirit, and Frontier also compete on this route." },
    { question: "What is the cheapest day to fly Atlanta to New York?", answer: "Tuesdays and Wednesdays typically offer the lowest fares. Avoid Monday mornings and Friday evenings when business travel demand peaks." },
    { question: "Should I fly into JFK, LaGuardia, or Newark?", answer: "LaGuardia is closest to Manhattan but smaller. JFK has the most international connections. Newark offers quick NJ Transit access to Penn Station. Compare all on ZIVO." },
    { question: "Is ZIVO a booking site or comparison site?", answer: "ZIVO is a comparison site that searches 500+ airlines and travel sites. We show you the best options, then redirect you to our trusted partners where you complete your booking." }
  ],
  "san-francisco-to-los-angeles": [
    { question: "How long is the SFO to LAX flight?", answer: "Direct flights from San Francisco to Los Angeles take about 1 hour 20 minutes. This is one of the most frequently flown routes in the United States." },
    { question: "Is flying faster than driving from SF to LA?", answer: "Flying takes 1.5 hours versus 6+ hours driving. Factor in airport time, but flying is generally faster unless you're visiting stops along Highway 1 or want to avoid airport hassle." },
    { question: "Which Bay Area airport should I use for LA flights?", answer: "SFO has the most options, but Oakland (OAK) and San Jose (SJC) often offer lower fares and shorter security lines. ZIVO compares all Bay Area airports." },
    { question: "Are there budget airlines on this route?", answer: "Yes, Southwest, JetBlue, and Spirit all serve the California corridor with competitive fares. ZIVO searches all carriers to show you complete pricing." },
    { question: "What makes ZIVO different from booking direct?", answer: "ZIVO searches 500+ sources simultaneously, potentially finding options you'd miss booking directly. We show you all options and redirect you to book with full partner support." }
  ],
  "new-york-to-london": [
    { question: "How long is the flight from New York to London?", answer: "Direct flights from New York to London take approximately 7 hours eastbound and 8 hours returning. Overnight departures arrive in London morning local time." },
    { question: "Which London airport should I fly into?", answer: "Heathrow offers the best Tube connections to Central London. Gatwick has competitive fares. City Airport is closest to Canary Wharf. Stansted and Luton serve budget carriers." },
    { question: "When are the cheapest flights to London from NYC?", answer: "January through early March (after holidays) and late fall offer the lowest transatlantic fares. Summer and Christmas periods are most expensive." },
    { question: "Are there budget airlines flying NYC to London?", answer: "Norwegian and several carriers offer lower-cost transatlantic options. Premium economy on legacy carriers also provides value. ZIVO shows all options from budget to business class." },
    { question: "How far ahead should I book transatlantic flights?", answer: "For best pricing, book 2-3 months ahead for transatlantic travel. Last-minute international bookings are typically very expensive." }
  ],
  "los-angeles-to-tokyo": [
    { question: "How long is the flight from LA to Tokyo?", answer: "Direct flights from Los Angeles to Tokyo take 11-12 hours. Westbound flights are slightly longer due to headwinds. Both Narita (NRT) and Haneda (HND) airports serve international flights." },
    { question: "What's the difference between Tokyo Narita and Haneda?", answer: "Haneda is closer to downtown Tokyo (about 30 minutes) while Narita is further (60-90 minutes). Haneda is more convenient but may have fewer international options." },
    { question: "Which airlines fly LA to Tokyo?", answer: "Japan Airlines (JAL), All Nippon Airways (ANA), American, United, and Delta all serve this transpacific route. Japanese carriers are known for exceptional service." },
    { question: "When is cherry blossom season in Tokyo?", answer: "Cherry blossoms typically peak late March to early April. This is peak travel season with high prices - book 3-4 months ahead for best rates during this period." },
    { question: "Does ZIVO search Japanese airlines?", answer: "Yes, ZIVO searches across 500+ airlines worldwide including JAL, ANA, and other international carriers. We help you compare all options to find the best transpacific deal." }
  ]
};

// =========================================
// HOTEL CITY FAQs
// =========================================

export const hotelCityFAQs: Record<string, FAQItem[]> = {
  "new-york": [
    { question: "What is the best neighborhood to stay in New York City?", answer: "For first-time visitors, Midtown offers easy access to Times Square, Broadway, and Central Park. SoHo suits shoppers, Brooklyn appeals to trendsetters, and the Upper East Side provides a quieter, upscale experience." },
    { question: "How much should I expect to pay for a hotel in NYC?", answer: "New York hotel prices vary widely. Budget hotels start around $150/night, mid-range options run $200-400, and luxury properties exceed $500. Prices fluctuate with seasons and events." },
    { question: "When is the cheapest time to visit New York?", answer: "January through early March (after New Year's) offers the lowest hotel rates. August also sees reduced business travel. Major holidays and fall foliage season command premium prices." },
    { question: "Is Manhattan or Brooklyn better for a NYC hotel?", answer: "Manhattan puts you closest to major attractions. Brooklyn offers better value, hip neighborhoods, and skyline views with easy subway access to Manhattan. Both are excellent choices." },
    { question: "How does ZIVO compare hotel prices?", answer: "ZIVO searches hundreds of booking sites including Booking.com, Expedia, Hotels.com, and more. We show you prices across all platforms so you can find the best deal and book with your preferred partner." }
  ],
  "los-angeles": [
    { question: "Where should I stay in Los Angeles?", answer: "Santa Monica offers beach access and walkability. Hollywood is central to attractions. Downtown LA has urban energy. Beverly Hills provides luxury shopping. Your choice depends on planned activities." },
    { question: "Do I need a car if staying in Los Angeles?", answer: "A car is highly recommended for LA. The city is spread across a huge area and public transit is limited. Beach communities like Santa Monica are more walkable than inland areas." },
    { question: "What's the average hotel price in Los Angeles?", answer: "LA hotel prices vary by neighborhood. Beach areas average $250-400/night, Hollywood $150-300, and downtown $150-250. Luxury properties can exceed $600/night." },
    { question: "When is the best time to visit Los Angeles?", answer: "LA has pleasant weather year-round. September-November offers warm days without summer crowds. June can be overcast (June Gloom). Prices peak in summer and around major events." },
    { question: "Does ZIVO charge fees for hotel bookings?", answer: "No, ZIVO never charges booking fees. We're a free comparison service that shows you prices across 500+ booking sites, then redirects you to book directly with your chosen partner." }
  ],
  "miami": [
    { question: "Should I stay on Miami Beach or Downtown?", answer: "Miami Beach offers beaches and nightlife with higher prices. Downtown/Brickell suits business travelers and urban explorers. Mid-Beach provides a balance of beach access and calmer atmosphere." },
    { question: "What are resort fees in Miami hotels?", answer: "Many Miami hotels charge daily resort fees ($25-50+) on top of room rates. These often include pool access, WiFi, and amenities. Always check total cost including fees when comparing prices on ZIVO." },
    { question: "When is the best time to book Miami hotels?", answer: "December through April is high season with highest rates. Summer offers lower prices but hot, humid weather. Book 6-8 weeks ahead for high season visits." },
    { question: "What's the difference between South Beach and Miami Beach?", answer: "South Beach is the southern tip of Miami Beach, known for Art Deco architecture, nightclubs, and tourist crowds. Miami Beach extends north with quieter neighborhoods like Mid-Beach and North Beach." },
    { question: "How does ZIVO show Miami hotel prices?", answer: "ZIVO aggregates real-time prices from major booking platforms. We show you options across all neighborhoods and price points, then redirect you to the booking site where you complete your reservation." }
  ],
  "las-vegas": [
    { question: "Where should I stay on the Las Vegas Strip?", answer: "Center Strip locations (Bellagio, Paris, Cosmopolitan) minimize walking between casinos. South Strip offers newer properties. North Strip has classic hotels. All provide the Vegas experience." },
    { question: "What are resort fees in Las Vegas?", answer: "Nearly all Las Vegas hotels charge daily resort fees ($35-50+) covering WiFi, pool, fitness center. Always add resort fees to base rates when comparing prices. ZIVO helps you understand total costs." },
    { question: "When is the cheapest time to visit Vegas?", answer: "Weekdays are dramatically cheaper than weekends. January and July-August offer lower rates. Avoid major conventions, holidays, and big fight weekends for best pricing." },
    { question: "Is Downtown Las Vegas better value than the Strip?", answer: "Downtown offers lower hotel rates and a different vibe with the Fremont Street Experience. Strip hotels provide the full mega-resort experience. Both have merits depending on your preference." },
    { question: "Can I book Vegas hotels through ZIVO?", answer: "ZIVO shows you Vegas hotel prices from all major booking sites. When you find a rate you like, we redirect you to that booking partner to complete your reservation securely." }
  ],
  "chicago": [
    { question: "What's the best area to stay in Chicago?", answer: "The Magnificent Mile offers shopping and central location. River North has dining and nightlife. The Loop suits business travelers. Lincoln Park provides a neighborhood feel with lake access." },
    { question: "How much do Chicago hotels cost?", answer: "Chicago hotel prices range from $100-150 for budget options to $300-500 for upscale properties. Prices increase significantly during major conventions and summer festivals." },
    { question: "When should I visit Chicago?", answer: "Summer brings festivals and great weather but higher prices. Fall offers pleasant temperatures and fewer crowds. Winter is cold but sees lowest hotel rates and holiday festivities." },
    { question: "Are Chicago hotels near public transit?", answer: "Most downtown hotels are within walking distance of L train stations. The transit system efficiently connects hotels to airports, museums, and neighborhoods. Consider proximity when booking." },
    { question: "How does ZIVO help find Chicago hotels?", answer: "ZIVO searches across 500+ hotel booking sites simultaneously, showing you real-time prices for Chicago hotels. We help you compare options, then redirect you to book with your preferred partner." }
  ],
  "paris": [
    { question: "Which Paris arrondissement should I stay in?", answer: "The 1st-4th offer central location near major sights. The 6th and 7th provide Left Bank charm. Le Marais (3rd/4th) balances history and trendy shopping. Montmartre (18th) delivers artistic atmosphere at lower prices." },
    { question: "How much are Paris hotels?", answer: "Paris hotel prices range from €100-150 for budget options to €300-800 for luxury properties. Central arrondissements command premiums. Prices peak during fashion weeks and summer." },
    { question: "When is the best time to visit Paris?", answer: "April-June and September-October offer pleasant weather and manageable crowds. Summer is peak tourist season. July and August see some closures as Parisians vacation." },
    { question: "Are Paris hotel rooms small?", answer: "Yes, Paris hotel rooms are typically smaller than American standards. Check room sizes in square meters. Boutique hotels in older buildings may have especially compact spaces." },
    { question: "Can ZIVO find Paris hotels in specific areas?", answer: "Yes, search for Paris on ZIVO to see hotels across all neighborhoods. You can compare prices and locations, then book through our trusted European and global partner sites." }
  ],
  "london": [
    { question: "Where is the best area to stay in London?", answer: "Westminster puts you near Big Ben and attractions. Covent Garden offers theater district access. Kensington is upscale and museum-adjacent. Shoreditch appeals to art and nightlife seekers." },
    { question: "How expensive are London hotels?", answer: "Central London hotels range from £100-200 for budget options to £400+ for luxury properties. Staying outside Zone 1 with good Tube access offers savings without sacrificing convenience." },
    { question: "When are London hotel prices lowest?", answer: "January-February and November (excluding holidays) typically offer the best rates. Summer and Christmas season see peak pricing. Major events and exhibitions also affect availability." },
    { question: "Should I stay in Central London or further out?", answer: "Central London (Zone 1) offers walkability to attractions. Zones 2-3 provide better value with easy Tube access. The trade-off is commute time versus hotel savings." },
    { question: "Does ZIVO include UK hotel booking sites?", answer: "Yes, ZIVO searches across global and European booking platforms including those popular in the UK. We show you comprehensive options and prices for London hotels." }
  ],
  "tokyo": [
    { question: "What area should I stay in Tokyo?", answer: "Shinjuku offers great transport links and nightlife. Shibuya appeals to fashion enthusiasts. Ginza provides upscale shopping. Asakusa delivers traditional atmosphere near Senso-ji Temple." },
    { question: "Are Tokyo hotels small?", answer: "Japanese hotel rooms are typically smaller than Western standards. Check room sizes in square meters. Capsule hotels offer unique ultra-compact experiences. Business hotels balance size and value." },
    { question: "Should I try a ryokan in Tokyo?", answer: "While traditional ryokan (Japanese inns) are more common in Kyoto and onsen towns, some Tokyo properties offer the experience. It's worth trying for at least one night of your trip." },
    { question: "When is cherry blossom season in Tokyo?", answer: "Cherry blossoms typically bloom late March to early April, varying yearly. Hotels book quickly and prices peak during this time. Book 3-4 months ahead for sakura season visits." },
    { question: "How does ZIVO search Tokyo hotels?", answer: "ZIVO searches Japanese and international booking sites to show you Tokyo hotel options. We compare prices across platforms, then redirect you to book with your chosen partner." }
  ],
  "dubai": [
    { question: "Where should I stay in Dubai?", answer: "Downtown Dubai offers Burj Khalifa views and Dubai Mall access. Palm Jumeirah provides luxury beach resorts. Dubai Marina has a more urban feel. Old Dubai delivers cultural immersion at lower prices." },
    { question: "When is the best time to visit Dubai?", answer: "November through March offers pleasant temperatures (70-80°F). Summer (June-August) brings extreme heat (110°F+) but significantly lower hotel rates for those who can handle the climate." },
    { question: "Are Dubai hotels expensive?", answer: "Dubai offers the full spectrum from budget to ultra-luxury. Beach resorts and Palm Jumeirah properties are pricier. Downtown and marina offer mid-range options. Budget hotels exist in Deira and Bur Dubai." },
    { question: "What are all-inclusive options in Dubai?", answer: "Many beach resorts offer all-inclusive packages covering meals and activities. These can provide excellent value for families. Compare total package costs on ZIVO with room-only rates." },
    { question: "Can I book Dubai hotels through ZIVO?", answer: "Yes, ZIVO searches global and regional booking platforms for Dubai hotels. We show you prices across properties from budget to luxury, then redirect you to book with your chosen partner." }
  ],
  "cancun": [
    { question: "Should I stay in the Hotel Zone or Downtown Cancun?", answer: "The Hotel Zone has beaches, all-inclusive resorts, and tourist amenities. Downtown Cancun offers authentic Mexican culture at lower prices with beach access via bus. Your choice depends on priorities." },
    { question: "What's the best time to visit Cancun?", answer: "December through April offers dry season and peak prices. November and May provide good weather with fewer crowds. Summer has deals but includes hurricane season risk." },
    { question: "Are all-inclusive resorts worth it in Cancun?", answer: "All-inclusives dominate Cancun's Hotel Zone and can provide excellent value including meals, drinks, and activities. Compare total package costs on ZIVO against hotel-only rates." },
    { question: "Should I consider Playa del Carmen or Tulum?", answer: "Playa del Carmen offers a pedestrian-friendly downtown with boutique hotels. Tulum provides bohemian beach vibes and Mayan ruins. Both are easy day trips from Cancun or alternatives to stay." },
    { question: "How does ZIVO compare Cancun resorts?", answer: "ZIVO searches major booking platforms for Cancun hotels and resorts. We show you all-inclusive and room-only options so you can compare total value and book with your preferred partner." }
  ]
};

// =========================================
// CAR RENTAL CITY FAQs
// =========================================

export const carRentalCityFAQs: Record<string, FAQItem[]> = {
  "miami": [
    { question: "Where should I pick up a rental car in Miami?", answer: "Miami International Airport is most convenient for tourists. Off-airport locations in Miami Beach or Downtown often offer lower rates. Fort Lauderdale Airport is also an option with competitive pricing." },
    { question: "Do I need a car in Miami?", answer: "While Miami Beach is somewhat walkable, a car is valuable for exploring South Florida - the Everglades, Keys, Fort Lauderdale, and Palm Beach are all within driving distance." },
    { question: "What type of car should I rent in Miami?", answer: "Convertibles are popular for cruising Ocean Drive. SUVs suit families. Economy cars work for basic transportation. Consider your plans - beach trips may need cargo space for gear." },
    { question: "Are there toll roads in Miami?", answer: "Yes, Miami has extensive toll roads including the Florida Turnpike and expressways. Ask about SunPass or toll transponder options when renting to avoid mail-in toll bills." },
    { question: "How does ZIVO compare Miami rental car prices?", answer: "ZIVO searches across major rental companies including Hertz, Enterprise, Avis, Budget, and more. We show you prices for all pickup locations so you can find the best deal." }
  ],
  "las-vegas": [
    { question: "Where is the car rental center in Las Vegas?", answer: "The McCarran Rent-A-Car Center consolidates all major rental companies in one building. It's connected to the airport by free tram but is not in the main terminals." },
    { question: "Do I need a car in Las Vegas?", answer: "Not for Strip-only visits, but a car is valuable for day trips to Grand Canyon, Red Rock Canyon, Hoover Dam, and Valley of Fire. Consider renting only for day trips." },
    { question: "When are Vegas rental cars cheapest?", answer: "Weekdays are significantly cheaper than weekends. Avoid convention weeks and major events. Summer can be cheaper as extreme heat deters some visitors." },
    { question: "Can I rent luxury cars in Las Vegas?", answer: "Yes, Las Vegas has excellent exotic and luxury car rental options. Lamborghini, Ferrari, and Porsche rentals are readily available for the Vegas experience." },
    { question: "How does ZIVO find cheap Vegas car rentals?", answer: "ZIVO searches all major rental companies simultaneously, showing you real-time prices for Las Vegas. We compare rates and redirect you to book directly with the rental company." }
  ],
  "los-angeles": [
    { question: "Which LA airport is best for car rental?", answer: "LAX has the most options but can be congested. Burbank offers faster pickup for those coming from the Valley. Consider your first destination when choosing airports." },
    { question: "Do I need a car in Los Angeles?", answer: "Yes, LA essentially requires a car. The city is spread across an enormous area and public transit is limited. Plan for traffic, especially during rush hours." },
    { question: "How expensive is parking in LA?", answer: "Parking costs vary significantly. Beach parking is often $15-25/day. Downtown and Hollywood can be $30+. Many hotels charge $30-50/night. Factor parking into your rental budget." },
    { question: "Should I rent a convertible in LA?", answer: "Convertibles are popular for PCH coastal drives and the year-round pleasant weather. Book early in summer when demand peaks for drop-tops." },
    { question: "Can I compare off-airport rental locations on ZIVO?", answer: "Yes, ZIVO searches both airport and off-airport rental locations in Los Angeles. Off-airport sites often offer lower rates and faster pickup times." }
  ],
  "orlando": [
    { question: "Do I need a car for a Disney vacation?", answer: "Disney offers excellent free transportation within its parks and to airport. A car is helpful for visiting Universal, SeaWorld, or restaurants outside Disney, but not essential for Disney-only trips." },
    { question: "Where should I pick up a car in Orlando?", answer: "Orlando International Airport has all major rental companies. If staying on Disney property, you can also rent from in-resort locations for day trips." },
    { question: "What size car should I rent for Orlando?", answer: "Families often need SUVs or minivans for luggage and theme park purchases. If it's a couple, a compact car works fine. Book larger vehicles early - they sell out." },
    { question: "Are there toll roads in Orlando?", answer: "Yes, Central Florida has many toll roads. Most rental cars offer SunPass transponders. Alternatively, license plate tolling bills you by mail (usually with fees)." },
    { question: "How does ZIVO help with Orlando rentals?", answer: "ZIVO compares prices across all major rental companies for Orlando. We show you options at the airport and in tourist areas so you can find the best deal for your vacation." }
  ],
  "new-york": [
    { question: "Do I need a car in New York City?", answer: "Not for Manhattan. Driving and parking in the city is stressful and expensive. However, a rental car is great for day trips to the Hamptons, Hudson Valley, or Catskills." },
    { question: "Which NYC airport is best for car rentals?", answer: "Newark often has lower rates than JFK or LaGuardia. All three have comprehensive rental options. Consider your first destination and traffic patterns when choosing." },
    { question: "How expensive is parking in NYC?", answer: "Manhattan parking can exceed $50-80/day. Street parking is extremely limited. If exploring the city, use transit and rent a car only for day trips outside the city." },
    { question: "Can I rent in New Jersey for NYC trips?", answer: "Yes, New Jersey locations often offer better rates. This works well for trips to surrounding areas. Just factor in any tolls and bridge costs." },
    { question: "How does ZIVO search NYC area rentals?", answer: "ZIVO searches rental companies at all NYC-area airports and city locations. We compare prices across JFK, LaGuardia, Newark, and Manhattan to find your best option." }
  ],
  "chicago": [
    { question: "Do I need a car in Chicago?", answer: "Not for downtown - the L train covers most attractions well. A car is helpful for reaching suburbs and day trips to Wisconsin or Indiana Dunes." },
    { question: "Which Chicago airport has better rental rates?", answer: "Midway often offers slightly lower rates than O'Hare. O'Hare has more rental companies and inventory. Compare both on ZIVO to find your best deal." },
    { question: "How bad is Chicago traffic?", answer: "Rush hour traffic on expressways is notoriously heavy. Allow extra time for airport returns. The Kennedy (I-90/94) and Dan Ryan are particularly congested." },
    { question: "What about driving in Chicago winter?", answer: "Winter driving requires caution with snow and ice. Consider AWD or 4WD if visiting November-March. Major streets are cleared quickly, but side streets can be challenging." },
    { question: "Can ZIVO help find suburban Chicago rentals?", answer: "Yes, ZIVO searches rental locations throughout the Chicago area including O'Hare, Midway, downtown, and suburban locations. Compare all options to find the best deal." }
  ],
  "dallas": [
    { question: "Do I need a car in Dallas?", answer: "Yes, Dallas-Fort Worth is extremely spread out with limited public transit. A car is essentially mandatory for visitors wanting to explore the metroplex." },
    { question: "Should I rent from DFW or Love Field?", answer: "DFW has more rental companies and inventory. Love Field is more convenient for Southwest flyers. Compare prices on ZIVO - Love Field sometimes offers savings." },
    { question: "Are there toll roads in Dallas?", answer: "Yes, the Dallas-Fort Worth area has extensive toll roads. Get a TollTag through your rental company or expect toll-by-mail charges on your credit card." },
    { question: "How hot does it get in Dallas?", answer: "Summer temperatures regularly exceed 100°F. Make sure your rental car AC works before leaving the lot. Consider covered parking when possible." },
    { question: "How does ZIVO compare Dallas rental prices?", answer: "ZIVO searches all major rental companies at both DFW and Love Field airports. We show you comprehensive pricing so you can find the best deal for your Texas trip." }
  ],
  "atlanta": [
    { question: "Where is the rental car center at ATL?", answer: "Hartsfield-Jackson's rental car center is connected to the airport by SkyTrain. It takes about 10-15 minutes to reach from the baggage claim area." },
    { question: "Do I need a car in Atlanta?", answer: "MARTA reaches the airport and some attractions, but Atlanta is spread out. A car is helpful for exploring neighborhoods, suburbs, and day trips to Savannah or the mountains." },
    { question: "How is Atlanta traffic?", answer: "Atlanta traffic is notoriously congested, especially on I-285 and I-85. Rush hours extend from 7-10 AM and 4-7 PM. Plan accordingly and use navigation apps." },
    { question: "What type of car should I rent in Atlanta?", answer: "A standard sedan works for most visitors. SUVs are helpful for mountain day trips with unpaved roads. Economy cars suffice for city-only exploration." },
    { question: "Can I compare Atlanta rental prices on ZIVO?", answer: "Yes, ZIVO searches all major rental companies at Hartsfield-Jackson and other Atlanta-area locations. We compare prices so you can find the best deal for your trip." }
  ],
  "phoenix": [
    { question: "Do I need a car in Phoenix?", answer: "Yes, Phoenix and the surrounding valley are extremely spread out with limited public transit. A car is essential for visiting Scottsdale, Sedona, Grand Canyon, and other destinations." },
    { question: "Where do I get rental cars at Phoenix airport?", answer: "The Rental Car Center at Sky Harbor is connected to terminals by a free shuttle. All major rental companies operate from this centralized facility." },
    { question: "Should I rent an SUV for Arizona?", answer: "SUVs are recommended if you plan to explore Sedona, the Grand Canyon, or other areas with unpaved roads. For city-only travel, a standard car is sufficient." },
    { question: "How hot does Phoenix get?", answer: "Summer temperatures regularly exceed 110°F. Ensure your AC works, park in shade when possible, and never leave items that can melt in the car." },
    { question: "How does ZIVO find cheap Phoenix rentals?", answer: "ZIVO searches all major rental companies at Sky Harbor and throughout the Phoenix metro area. We compare real-time prices so you can find the best deal for your desert adventure." }
  ],
  "san-diego": [
    { question: "Do I need a car in San Diego?", answer: "A car is helpful but not essential. Beach communities are walkable, and the trolley connects downtown to various neighborhoods. However, a car expands your options significantly." },
    { question: "Where is the rental car center at San Diego airport?", answer: "The consolidated rental car facility is a short shuttle ride from the terminals at SAN. All major rental companies operate from this location." },
    { question: "Can I drive to Tijuana with a rental car?", answer: "Most rental car contracts prohibit driving into Mexico. Check your rental agreement carefully. If you want to visit Tijuana, consider walking across the border or using a tour service." },
    { question: "Should I rent a convertible in San Diego?", answer: "San Diego's year-round pleasant weather makes it perfect for convertibles. They're popular for coastal drives and exploring beach communities." },
    { question: "How does ZIVO compare San Diego car rentals?", answer: "ZIVO searches major rental companies at SAN airport and throughout San Diego. We show you prices across all options so you can find the best deal for your California trip." }
  ]
};

// Helper functions to get FAQs
export function getFlightRouteFAQs(fromSlug: string, toSlug: string): FAQItem[] {
  const key = `${fromSlug}-to-${toSlug}`;
  return flightRouteFAQs[key] || [];
}

export function getHotelCityFAQs(slug: string): FAQItem[] {
  return hotelCityFAQs[slug] || [];
}

export function getCarRentalCityFAQs(slug: string): FAQItem[] {
  return carRentalCityFAQs[slug] || [];
}
