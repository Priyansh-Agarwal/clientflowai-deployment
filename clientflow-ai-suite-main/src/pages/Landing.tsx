import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Check, Phone, Clock, Users, TrendingUp, Shield, Zap, Sparkles, Rocket, Target } from "lucide-react";

// Declare Calendly type for TypeScript
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

export default function Landing() {
  const navigate = useNavigate();

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/priyanshagarwal/free-consulatation'
      });
    }
    return false;
  };

  const benefits = [
    {
      icon: Clock,
      title: "Custom AI Solutions",
      description: "Bespoke automation systems tailored to your unique business processes and workflows",
    },
    {
      icon: Users,
      title: "Enterprise Integration",
      description: "Seamlessly integrate with your existing tech stack and business infrastructure",
    },
    {
      icon: TrendingUp,
      title: "Strategic ROI",
      description: "Data-driven implementations designed to maximize operational efficiency and revenue",
    },
    {
      icon: Zap,
      title: "White-Glove Service",
      description: "Dedicated team managing implementation, optimization, and ongoing support",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security protocols ensuring your data remains protected and compliant",
    },
    {
      icon: Phone,
      title: "Scalable Architecture",
      description: "Future-proof solutions that grow alongside your business objectives",
    },
  ];

  const results = [
    {
      metric: "300%",
      label: "Average ROI",
      description: "First 12 months",
    },
    {
      metric: "85%",
      label: "Process Efficiency",
      description: "Operational improvement",
    },
    {
      metric: "24/7",
      label: "Autonomous Operations",
      description: "Round-the-clock automation",
    },
  ];

  const caseStudies = [
    {
      company: "Enterprise Healthcare Provider",
      result: "Automated 40,000+ patient interactions monthly",
      impact: "Reduced response time from 4 hours to 30 seconds",
    },
    {
      company: "National Real Estate Firm",
      result: "AI-powered lead qualification system",
      impact: "$2.3M additional revenue in 6 months",
    },
    {
      company: "Professional Services Group",
      result: "End-to-end client onboarding automation",
      impact: "75% reduction in administrative overhead",
    },
  ];

  const capabilities = [
    "Custom AI voice agents trained on your business",
    "Intelligent workflow automation across departments",
    "Advanced CRM and data integration",
    "Multi-channel communication orchestration",
    "Predictive analytics and business intelligence",
    "Natural language processing for customer interactions",
    "Enterprise-grade security and compliance",
    "Ongoing optimization and performance monitoring",
  ];

  const process = [
    {
      step: "01",
      title: "Discovery & Analysis",
      description: "Deep dive into your business processes, pain points, and automation opportunities",
    },
    {
      step: "02",
      title: "Strategy & Design",
      description: "Custom AI automation roadmap aligned with your business objectives and KPIs",
    },
    {
      step: "03",
      title: "Development & Integration",
      description: "Bespoke solution development with seamless integration into your infrastructure",
    },
    {
      step: "04",
      title: "Optimization & Scale",
      description: "Continuous monitoring, refinement, and expansion of your AI capabilities",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-navy/95 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Phone className="w-8 h-8 text-sky" />
                <Sparkles className="w-4 h-4 text-teal absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="text-xl font-bold text-white">ClientFlow AI</span>
              <Badge className="bg-teal text-white ml-2 hidden sm:inline-flex">Now Live</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={openCalendly}
                className="hidden sm:flex bg-white text-black border-white hover:bg-white/90"
              >
                Book Consultation
              </Button>
              <Button
                onClick={() => window.location.href = '/auth'}
                className="bg-gradient-to-r from-sky to-teal hover:opacity-90 text-white font-semibold"
              >
                Sign In / Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-primary to-accent opacity-20"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="bg-sky/20 text-sky border-sky mb-6 text-sm px-4 py-2">
            <Rocket className="w-4 h-4 mr-2 inline" />
            Revolutionizing Business Communications
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Enterprise AI Automation <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
              Built for Your Business
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
            Custom AI solutions that transform operations, eliminate bottlenecks, and unlock exponential growth. 
            We don't sell software—we engineer competitive advantages.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={openCalendly}
              className="bg-gradient-to-r from-sky to-teal hover:opacity-90 text-white text-lg px-10 py-7 shadow-premium font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Schedule Strategic Consultation
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = '/demo'}
              className="border-2 border-white bg-white text-navy hover:bg-white/90 text-lg px-10 py-7 font-semibold"
            >
              Watch Demo
            </Button>
          </div>
          <p className="text-white/70 mt-6 text-lg">
            Limited partnership slots • Enterprise-focused engagements
          </p>
          
          {/* Social Proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              <span>Fortune 500 Clients</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <span>$50M+ Revenue Impact</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-success" />
              <span>Enterprise-Grade Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-sky/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="bg-destructive/10 text-destructive mb-4">The Challenge</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-navy mb-6">
              Your Competition is Already <br />
              <span className="text-destructive">Automating While You're Hiring</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Enterprise leaders are leveraging AI to scale operations, reduce costs by millions, 
              and deliver experiences that human teams simply cannot match. The question isn't if you'll automate—it's whether you'll lead or follow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {results.map((item, index) => (
              <Card key={index} className="shadow-premium border-primary/20 hover:scale-105 transition-transform">
                <CardContent className="pt-8 text-center">
                  <div className="text-6xl font-bold bg-gradient-to-r from-sky to-teal bg-clip-text text-transparent mb-4">
                    {item.metric}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.label}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-navy to-primary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-success/20 text-success border-success mb-4">Our Approach</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Bespoke AI Systems <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
                Engineered for Enterprise Excellence
              </span>
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              We don't deploy cookie-cutter solutions. Every engagement begins with deep analysis 
              of your operations, followed by custom AI development that addresses your unique challenges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {capabilities.map((capability, index) => (
              <div key={index} className="flex items-start space-x-3 bg-white/10 backdrop-blur-sm p-5 rounded-xl border border-white/20 hover:bg-white/15 transition-all">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky to-teal flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg text-white font-medium">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-sky/10 text-sky mb-4">Why Partner With Us</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-navy mb-6">
              Enterprise-Grade AI <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
                Delivered With White-Glove Service
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="shadow-premium hover:scale-105 transition-transform border-t-4 border-t-sky">
                  <CardContent className="pt-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-sky to-teal rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-base">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-teal/10 text-teal mb-4">Proven Results</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-navy mb-6">
              Real Transformations,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
                Measurable Impact
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {caseStudies.map((study, index) => (
              <Card key={index} className="shadow-premium hover:scale-105 transition-transform border-l-4 border-l-teal">
                <CardContent className="pt-8">
                  <h3 className="text-lg font-bold text-navy mb-4">{study.company}</h3>
                  <p className="text-muted-foreground mb-3">{study.result}</p>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-teal font-semibold">{study.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-sky/10 text-sky mb-4">Our Process</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-navy mb-6">
              Strategic Implementation <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
                From Discovery to Scale
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-sky/10 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-navy mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-navy via-primary to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Badge className="bg-teal text-white mb-6 px-6 py-3 text-base">
            <Sparkles className="w-5 h-5 mr-2 inline animate-pulse" />
            Limited Partnership Slots
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Transform Your Enterprise <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-teal">
              With Custom AI Solutions
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
            Schedule a confidential consultation to explore how AI automation 
            can revolutionize your operations and unlock unprecedented growth.
          </p>
          <Button
            size="lg"
            onClick={openCalendly}
            className="bg-white hover:bg-white/90 text-navy text-xl px-16 py-8 shadow-2xl font-bold hover:scale-105 transition-transform"
          >
            <Rocket className="w-6 h-6 mr-3" />
            Book Strategic Consultation
          </Button>
          <p className="text-white/80 mt-8 text-lg font-medium">
            Enterprise-focused engagements • Custom solutions • White-glove service
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Phone className="w-8 h-8 text-sky" />
            <span className="text-xl font-bold text-white">ClientFlow AI</span>
          </div>
          <p className="text-white/70">
            © 2025 ClientFlow AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
