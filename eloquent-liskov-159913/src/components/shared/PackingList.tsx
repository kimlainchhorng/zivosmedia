import { Check, Square, Briefcase, Shirt, Camera, Pill, FileText, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const categories = [
  {
    name: "Essentials",
    icon: FileText,
    color: "text-blue-400",
    items: ["Passport/ID", "Travel Insurance", "Boarding Pass", "Hotel Confirmation", "Credit Cards"]
  },
  {
    name: "Clothing",
    icon: Shirt,
    color: "text-pink-400",
    items: ["Comfortable Shoes", "Weather-appropriate Clothes", "Sleepwear", "Swimwear", "Jacket/Sweater"]
  },
  {
    name: "Electronics",
    icon: Smartphone,
    color: "text-purple-400",
    items: ["Phone Charger", "Power Bank", "Adapter/Converter", "Headphones", "Camera"]
  },
  {
    name: "Health",
    icon: Pill,
    color: "text-green-400",
    items: ["Medications", "First Aid Kit", "Sunscreen", "Hand Sanitizer", "Face Masks"]
  },
];

const PackingList = () => {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const toggleItem = (item: string) => {
    setCheckedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const totalItems = categories.reduce((acc, cat) => acc + cat.items.length, 0);
  const progress = Math.round((checkedItems.length / totalItems) * 100);

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-teal-500/20 text-teal-400 border-teal-500/30">
            <Briefcase className="w-3 h-3 mr-1" /> Packing List
          </Badge>
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Don't Forget Anything
          </h2>
          <p className="text-muted-foreground">Interactive checklist for your trip</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Packing Progress</span>
            <span className="text-sm text-muted-foreground">{checkedItems.length}/{totalItems} items</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
              <Check className="w-4 h-4" /> All packed and ready to go!
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <div 
                key={category.name}
                className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/50 p-5"
              >
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${category.color}`} />
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.items.map((item) => {
                    const isChecked = checkedItems.includes(item);
                    return (
                      <button type="button"
                        key={item}
                        onClick={() => toggleItem(item)}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200 ${
                          isChecked 
                            ? "bg-green-500/10 text-green-400" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        {isChecked ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${isChecked ? "line-through opacity-70" : ""}`}>
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PackingList;
