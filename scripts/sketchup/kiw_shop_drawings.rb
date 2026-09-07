# Install in SketchUp 2026/SketchUp/Plugins. Requires an interactive, licensed
# SketchUp session. No arbitrary Ruby or shell commands arrive from the server.
require 'sketchup.rb'
require 'json'
require 'fileutils'
require 'uri'

module KIWShopDrawings
  ROOT = File.expand_path('~/shop-drawings/kiw-worker').freeze
  CONFIG = File.join(ROOT, 'config.json').freeze
  @requests = {}

  def self.http(url, method, body, headers, &callback)
    request = Sketchup::Http::Request.new(url, method)
    request.headers = headers
    request.body = body
    @requests[request.object_id] = request
    request.start do |req, response|
      @requests.delete(req.object_id)
      callback.call(response)
    end
  end

  def self.api(body, &callback)
    http(@config.fetch('url') + '/shop/api/shop-drawings/worker', Sketchup::Http::POST,
      JSON.generate(body), { 'Content-Type' => 'application/json', 'Authorization' => 'Bearer ' + @config.fetch('token') }, &callback)
  end

  def self.log(message)
    FileUtils.mkdir_p(ROOT)
    File.open(File.join(ROOT, 'worker.log'), 'a') { |f| f.puts("#{Time.now.utc} #{message}") }
  end

  def self.start
    return if @timer
    @config = JSON.parse(File.read(CONFIG))
    uri = URI.parse(@config.fetch('url'))
    raise 'Configure an HTTPS shop URL' unless uri.scheme == 'https' && uri.host && !uri.userinfo && (uri.path.empty? || uri.path == '/') && !uri.query
    @config['url'] = @config['url'].sub(%r{/$}, '')
    raise 'Invalid worker token' unless @config.fetch('token').match?(/\A[a-f0-9]{64}\z/)
    @timer = UI.start_timer(15, true) { poll }
    log('Worker started')
    poll
  rescue StandardError => e
    UI.messagebox("KIW Shop Drawings: #{e.message}")
  end

  def self.stop
    UI.stop_timer(@timer) if @timer
    @timer = nil
    log('Worker stopped; any current request will finish')
  end

  def self.poll
    return if @busy
    # Do not open a new document while someone has unsaved work in SketchUp.
    return if Sketchup.active_model.modified?
    @busy = true
    api({ action: 'claim' }) do |response|
      begin
        raise 'Claim service unavailable' unless response.status_code == 200
        job = JSON.parse(response.body)['request']
        if job
          previous = Sketchup.active_model
          Sketchup.file_new
          UI.start_timer(0.5, false) do
            begin
              model = Sketchup.active_model
              raise 'Could not create a separate drawing document' if model == previous
              build(model, job)
            rescue StandardError => e
              fail_job(job, e)
            end
          end
        else
          @busy = false
        end
      rescue StandardError => e
        log(e.message)
        @busy = false
      end
    end
  end

  def self.point(p)
    Geom::Point3d.new(p.fetch('x'), p.fetch('y'), p.fetch('z'))
  end

  def self.build(model, job)
    payload = job.fetch('payload')
    raise 'Unsupported payload' unless payload['version'] == 1 && payload['units'] == 'inches' && payload['draft'] == true
    model.start_operation('KIW measured drawing', true)
    begin
      # Only the newly created document is cleared, never the previous model.
      model.entities.clear!
      model.options['UnitsOptions']['LengthUnit'] = 0
      model.options['UnitsOptions']['LengthFormat'] = 1
      model.set_attribute('KIW', 'request_id', job.fetch('id'))
      model.set_attribute('KIW', 'measurements', JSON.generate(payload.fetch('measurements')))
      model.set_attribute('KIW', 'draft', true)
      surfaces = model.entities.add_group
      surfaces.name = 'Measured stairs and landings'
      payload.fetch('surfaces').each do |surface|
        group = surfaces.entities.add_group
        group.name = surface.fetch('label')
        corners = surface.fetch('corners').map { |p| point(p) }
        # Triangles also support an uneven, nonplanar measured landing.
        [[0, 1, 2], [0, 2, 3]].each do |indices|
          face = group.entities.add_face(indices.map { |i| corners[i] })
          face.material = surface['provisional'] ? 'Orange' : 'LightGray' if face
        end
        group.entities.add_text("#{surface['label']} | R #{surface['rise']} | Run #{surface['run']} | W #{surface['width']}", corners[0])
        group.entities.add_dimension_linear(corners[0], corners[1], Geom::Vector3d.new(0, 0, -3)) if corners[0].distance(corners[1]) > 0.01
      end
      rails = model.entities.add_group
      rails.name = 'Post and top rail centerlines — profiles require shop detailing'
      payload.fetch('posts').each do |post|
        rails.entities.add_line(point(post['base']), point(post['top']))
        rails.entities.add_text(post['label'] + (post['provisional'] ? ' — VERIFY' : ''), point(post['top']))
      end
      payload.fetch('posts').reject { |p| p['provisional'] }.group_by { |p| [p['segment'], p['side']] }.each_value do |posts|
        posts.each_cons(2) { |a, b| rails.entities.add_line(point(a['top']), point(b['top'])) }
      end
      payload.fetch('transitions').each do |transition|
        pts = transition.fetch('points').map { |p| point(p) }
        pts.each_cons(2) { |a, b| rails.entities.add_line(a, b) if a.distance(b) > 0.001 }
        rails.entities.add_text(transition['label'] + (transition['provisional'] ? ' — VERIFY' : ''), pts.first)
      end
      model.entities.add_text("#{payload['title']}\nDRAFT — DO NOT FABRICATE\n#{payload['issues'].join(', ')}", Geom::Point3d.new(0, 0, -12))
      model.commit_operation
    rescue StandardError
      model.abort_operation
      raise
    end
    center = model.bounds.center
    [['Plan', [0, 0, 1000], [0, 1, 0]], ['Side', [0, -1000, 0], [0, 0, 1]], ['ISO', [1000, -1000, 800], [0, 0, 1]]].each do |name, eye, up|
      model.active_view.camera = Sketchup::Camera.new(center.offset(Geom::Vector3d.new(eye)), center, Geom::Vector3d.new(up), false)
      model.active_view.zoom_extents
      model.pages.add(name)
    end
    FileUtils.mkdir_p(ROOT)
    path = File.join(ROOT, job.fetch('id') + '-' + job.fetch('lease') + '.skp')
    raise 'SketchUp save failed' unless model.save(path)
    File.write(path.sub(/\.skp$/, '.json'), JSON.pretty_generate(payload))
    http(job.fetch('uploadUrl'), Sketchup::Http::PUT, File.binread(path), { 'Content-Type' => 'application/octet-stream' }) do |response|
      if response.status_code.between?(200, 299)
        api({ action: 'complete', id: job['id'], lease: job['lease'] }) do |done|
          log("Request #{job['id']} completion HTTP #{done.status_code}")
          @busy = false
        end
      else
        fail_job(job, StandardError.new("Artifact upload HTTP #{response.status_code}"))
      end
    end
  end

  def self.fail_job(job, error)
    # Never log tokens, signed URLs, or HTTP response bodies.
    log("Request #{job['id']} failed: #{error.class}")
    api({ action: 'fail', id: job['id'], lease: job['lease'], error: 'SketchUp generation failed. Review the Mac mini worker.' }) { @busy = false }
  rescue StandardError
    @busy = false
  end

  unless file_loaded?(__FILE__)
    menu = UI.menu('Extensions').add_submenu('KIW Shop Drawings')
    menu.add_item('Start worker') { start }
    menu.add_item('Stop worker') { stop }
    file_loaded(__FILE__)
  end
end
