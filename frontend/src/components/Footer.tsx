import { Link } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    navigation: [
      { label: 'Accueil', to: '/' },
      { label: 'Biens', to: '/properties' },
      { label: 'Agents', to: '/agents' },
      { label: 'Catalogue', to: '/catalog' },
    ],
    legal: [
      { label: 'Conditions d\'utilisation', to: '/terms' },
      { label: 'Politique de confidentialité', to: '/privacy' },
      { label: 'Mentions légales', to: '/legal' },
    ],
    services: [
      { label: 'Estimation gratuite', to: '/estimation' },
      { label: 'Devenir agent', to: '/become-agent' },
      { label: 'Contact', to: '/contact' },
    ],
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-immo-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">IMMO</span>
            </Link>
            <p className="text-sm text-gray-400">
              Plateforme immobilière premium au Cameroun. Trouvez votre bien idéal parmi notre sélection exclusive.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              {footerLinks.navigation.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Services
            </h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-immo-500 flex-shrink-0" />
                <span className="text-sm text-gray-400">
                  Boulevard de la Liberté<br />
                  Douala, Cameroun
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-immo-500 flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <a href="tel:+237676416878" className="text-sm text-gray-400 hover:text-white transition-colors">
                    +237 676 416 878
                  </a>
                  <a href="tel:+237691929077" className="text-sm text-gray-400 hover:text-white transition-colors">
                    +237 691 929 077
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-immo-500 flex-shrink-0" />
                <a href="mailto:contact@immo.cm" className="text-sm text-gray-400 hover:text-white transition-colors">
                  contact@immo.cm
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              {currentYear} IMMO. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-gray-500 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}